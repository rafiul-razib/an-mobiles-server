const express = require ("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT ||  5000;
require ('dotenv').config();
const axios = require("axios");
const multer  = require('multer');
const FormData = require("form-data");

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
        console.log(newProductItem);
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


      // // API route to fetch unique models for desired brand
      // app.get("/allSmartPhones/:brand", async (req, res) => {
      //   const brandName = req.params.brand;
      //   const query = brandName.toLowerCase()
      //   const cursor = {brand: query}
      //   const models = await getUniqueModels(smartPhonesCollection,cursor);
      //   res.json(models);
      // });

      // // API to fetch specific models of desired Brands
      // app.get("/allSmartPhones/:brand/:model", async (req, res) => {
      //   const modelName = req.params.model;
      //   const cursor = {model: modelName}
      //   const models = await smartPhonesCollection.find(cursor).toArray();
      //   res.json(models);
      // });


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