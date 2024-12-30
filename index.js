require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.a1a1zbo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();

    // database & collections
    const db = client.db('BistroBoss');
    const menuCollection = db.collection('menuItems');
    const testimonialCollection = db.collection('testimonials');

    // menu related apis
    app.get('/featured-menu', async(req, res) => {    // get featured-menu limit(6)
        const result = await menuCollection.find().limit(6).toArray();
        res.send(result);
    })

    app.get('/menu', async(req, res) => {   // get all menu
      const result = await menuCollection.find().toArray();
      res.send(result);
    })



    // testimonial related apis
    app.get('/testimonials', async(req, res) => {
        const result = await testimonialCollection.find().toArray();
        res.send(result);
    })



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async(req, res) => {
    res.send('Bistro Boss server is running');
})

app.listen(port, () => {
    console.log('Bistro Boss server is running...');
})