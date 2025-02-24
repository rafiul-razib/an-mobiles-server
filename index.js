const express = require ("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT ||  5000;
require ('dotenv').config();
const axios = require("axios");
const multer  = require('multer');
const FormData = require("form-data");
const stripe = require("stripe")(process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_SK)

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://an-mobiles-client.vercel.app",

  ],
}));


// Middleware to parse JSON bodies
app.use(express.json());  

const image_hosting_key = process.env.NEXT_IMAGE_HOSTING_KEY;
const image_hosting_api = `https://api.imgbb.com/1/upload?key=${image_hosting_key}`;


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = "mongodb+srv://<db_username>:<db_password>@cluster0.gplglww.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const uri = `${process.env.URI}`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const database = client.db("anMobiles");
    const smartPhonesCollection = database.collection("smartPhones");
    const productsCollection = database.collection("products");
    const smartPhoneBrandsCollection = database.collection("smartPhoneBrands");
    const usersCollection = database.collection("users");
    const paymentInfoCollection = database.collection("paymentInfo");
    const orderCollection = database.collection("orders");



    async function getUniqueModels(collection, cursor) {
        try {
          const uniqueModels = await collection
            .aggregate([
              { $match: cursor },
              { $group: { _id: "$model", data: { $first: "$$ROOT" } } }, // Group by model and get first occurrence
              { $replaceRoot: { newRoot: "$data" } } // Extract only the original document
            ])
            .toArray();
      
          return uniqueModels;
        } catch (error) {
          console.error("Error fetching unique brands:", error);
          return [];
        }
      }

      async function getUniqueBrands(collection, cursor) {
        try {
          const uniqueBrands = await collection
            .aggregate([
              { $match: cursor },
              { $group: { _id: "$brand", data: { $first: "$$ROOT" } } }, // Group by brand and get first occurrence
              { $replaceRoot: { newRoot: "$data" } } // Extract only the original document
            ])
            .toArray();
      
          return uniqueBrands;
        } catch (error) {
          console.error("Error fetching unique brands:", error);
          return [];
        }
      }
      
      // CRUD
      // All smartphones

      app.post("/addNewProduct", async(req, res)=>{
        const newProductItem = req.body;
        // console.log(newProductItem);
        const result = await productsCollection.insertOne(newProductItem);
        res.send(result)
      })

      app.get("/allProducts", async(req, res)=>{
        const result = await productsCollection.find().toArray();
        res.send(result)
      })

      app.delete("/dashboard/deleteProduct/:id", async(req,res)=>{
        const productId = req.params.id;
        const query = {_id: new ObjectId(productId)};
        const result = await productsCollection.deleteOne(query);
        res.send(result)
      })


      // All products by category
      app.get("/allProducts/:category", async(req, res)=>{
        const categoryName = req.params.category;
        const cursor = {category: categoryName};
        const result = await productsCollection.find(cursor).toArray();
        res.send(result)
      })

      // Unique products by category
      app.get("/products/:category", async (req, res) => {
        try {
          const categoryName = req.params.category;
      
          const cursor = { category: { $regex: new RegExp(`^${categoryName}$`, "i") } }; // Case-insensitive match
      
          const result = await getUniqueBrands(productsCollection, cursor);
          res.json(result);
        } catch (error) {
          console.error("Error fetching unique brands:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      });
      

      // API route to fetch unique models for desired brand of desired category
      app.get("/allProducts/:category/:brand", async (req, res) => {
        try {
          const categoryName = req.params.category;
          const brandText = req.params.brand;
          const brandName = brandText.toLowerCase() // Ensure case-insensitive matching
      
          const cursor = {category: categoryName ,brand: brandName };
          const models = await getUniqueModels(productsCollection, cursor);
      
          res.json(models);
        } catch (error) {
          console.error("Error fetching products:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      });

      // API to fetch specific models of desired Brands
      app.get("/allProducts/:category/:brand/:model", async (req, res) => {
        try {
          const { category, brand, model } = req.params;
      
          const cursor = {
            category,
            brand: { $regex: new RegExp(`^${brand}$`, "i") }, // Case-insensitive match
            model: { $regex: new RegExp(`^${model}$`, "i") }  // Case-insensitive match
          };
      
          const products = await productsCollection.find(cursor).toArray();
          res.json(products);
        } catch (error) {
          console.error("Error fetching products:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      });



    // All Smartphone Brands
      app.get("/allSmartPhoneBrands", async(req, res)=>{
        const result = await smartPhoneBrandsCollection.find().toArray();
        res.send(result)
      })

      // Fetch Product Details
      app.get("/product/:productId", async(req, res)=>{
        const id = req.params.productId;
        const cursor = {_id: new ObjectId(id)};
        const result = await productsCollection.findOne(cursor);
        res.send(result)
      })

      app.post("/newUser", async(req, res)=>{
        const newUser = req.body
        const result = await usersCollection.insertOne(newUser);
        res.send(result)
      })

      app.post("/create-payment-intent", async (req, res) => {
        try {
          const { totalPrice } = req.body;
      
          const amount = parseInt(totalPrice * 100); // Convert price to cents
      
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "GBP", // Make sure your Stripe settings support this currency
            payment_method_types: ["card"],
          });
      
          res.json({ clientSecret: paymentIntent.client_secret });
        } catch (error) {
          console.error("Payment Intent Error:", error);
          res.status(500).json({ error: "Internal Server Error" });
        }
      });


      app.post("/payments", async (req, res) => {
        try {
          const payment = req.body;
          const email = payment.billing_details.email;
      
          // Define cursor to delete items from cart
          const cursor = { userEmail: email };
      
          // Insert payment record into database
          const paymentResult = await paymentInfoCollection.insertOne(payment);
      
          // Delete paid products from cart
          const deleteFromCart = await orderCollection.deleteMany(cursor);
      
          // Extract product IDs and quantities from payment
          const products = payment.items.map(item => ({
            productId: new ObjectId(item.productId),
            quantity: item.quantity || 1 // Ensure quantity exists (default: 1)
          }));
      
          // Ensure products array is not empty
          if (!products.length) {
            return res.status(400).json({ error: "No products to update" });
          }
      
          // Bulk update stock for better efficiency
          const bulkOps = products.map(product => ({
            updateOne: {
              filter: { _id: product.productId, stock: { $gte: product.quantity } }, // Ensure stock is available
              update: { $inc: { stock: -product.quantity } } // Decrease stock
            }
          }));
      
          const updateResult = await productsCollection.bulkWrite(bulkOps);
      
          // Return response
          res.json({ paymentResult, updateResult, deleteFromCart });
      
        } catch (error) {
          console.error("Payment Processing Error:", error);
          res.status(500).json({ error: "Internal Server Error" });
        }
      });

      app.get("/allPaidOrders", async(req, res)=>{
        const result = await paymentInfoCollection.find().toArray();
        res.send(result)
      })

      app.get("/orderDetails/:id", async(req, res)=>{
        const id = req.params.id;
        const cursor = {_id: new ObjectId(id)};
        const result = await paymentInfoCollection.findOne(cursor);
        res.send(result);
      })
      


      app.post("/addToBasket", async(req, res)=>{
        const order = req.body;
        const result = await orderCollection.insertOne(order);
        res.send(result)
      })


      app.get('/myBasketProducts', async (req, res) => {
        try {
          let query = {};
          
          if (req.query?.email) {
            // console.log(req.query);
            query = { userEmail: req.query.email }; // Corrected typo
          }
      
          const result = await orderCollection.find(query).toArray();
          res.send(result);
        } catch (error) {
          console.error("Error fetching basket products:", error);
          res.status(500).send({ message: "Server error" });
        }
      });
      

      app.delete("/deleteFromCart/:id", async(req, res)=>{
        const id = req.params.id;
        cursor = {_id: new ObjectId(id)};
        const result = await orderCollection.deleteOne(cursor);
        res.send(result)
      })

      app.patch("/confirmOrder/:id", async(req, res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const confirmOrder = {
          $set: {
            status: "Confirmed",
            confirmedOn: new Date()
          }
        };
        const result = await paymentInfoCollection.updateOne(filter, confirmOrder);
        res.send(result)
      })

      app.patch("/dispatchOrder/:id", async(req, res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const confirmOrder = {
          $set: {
            status: "Dispatched",
            dispatchedOn: new Date()
          }
        };
        const result = await paymentInfoCollection.updateOne(filter, confirmOrder);
        res.send(result)
      })

      app.patch("/cancelOrder/:id", async(req, res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const confirmOrder = {
          $set: {
            status: "Cancelled",
            cancelledOn: new Date()
          }
        };
        const result = await paymentInfoCollection.updateOne(filter, confirmOrder);
        res.send(result)
      })
      
      


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Convert image to Base64 for ImgBB API
    const formData = new FormData();
    formData.append("image", req.file.buffer.toString("base64"));

    // Send image to ImgBB
    const response = await axios.post(image_hosting_api, formData, {
      headers: formData.getHeaders(),
    });

    if (response.data.success) {
      return res.json({ success: true, url: response.data.data.display_url });
    } else {
      return res.status(500).json({ error: "Image upload failed" });
    }
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});





app.get("/", (req,res)=>{
    res.send("AN Mobiles server is running!")
})

app.listen(port, ()=>{
    console.log(`Listening to the port : ${port}`)
})