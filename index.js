const express = require ("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT ||  5000;
require ('dotenv').config();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://an-mobiles-client.vercel.app",

  ],
}));



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
    const smartPhoneBrandsCollection = database.collection("smartPhoneBrands");
    const usersCollection = database.collection("users");



    async function getUniqueModels(cursor) {
        try {
          const uniqueModels = await smartPhonesCollection
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

      // All smartphones
      app.get("/allSmartPhones", async(req, res)=>{
        const result = await smartPhonesCollection.find().toArray();
        res.send(result)
      })
      
      // API route to fetch unique models for desired brand
      app.get("/allSmartPhones/:brand", async (req, res) => {
        const brandName = req.params.brand;
        const query = brandName.toLowerCase()
        const cursor = {brand: query}
        const models = await getUniqueModels(cursor);
        res.json(models);
      });

      // API to fetch specific models of desired Brands
      app.get("/allSmartPhones/:brand/:model", async (req, res) => {
        const modelName = req.params.model;
        const cursor = {model: modelName}
        const models = await smartPhonesCollection.find(cursor).toArray();
        res.json(models);
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
        const result = await smartPhonesCollection.findOne(cursor);
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



app.get("/", (req,res)=>{
    res.send("AN Mobiles server is running!")
})

app.listen(port, ()=>{
    console.log(`Listening to the port : ${port}`)
})