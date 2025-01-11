require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// verifyToken
const verifyToken = async(req, res, next) => {
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({ message: 'Unauthorized Access' })
  }
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({ message: 'Unauthorized Access' });
    }

    req.user = decoded;
    next();
  })
}


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
    const userCollection = db.collection('users');
    const menuCollection = db.collection('menuItems');
    const testimonialCollection = db.collection('testimonials');
    const cartCollection = db.collection('carts');

    // verifyAdmin
    const verifyAdmin = async(req, res, next) => {
      const email = req?.user?.email;
      console.log(email);
      const query = { userEmail: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    }

    // jwt related apis
    app.post('/create-token', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '365d' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: false
      }).send({ success: true });
    })

    
    // users related apis
    app.get('/users', verifyToken, verifyAdmin, async(req, res) => {
      // const queryEmail = req?.query?.email;
      // const tokenEmail = req?.user?.email;
      
      // if(queryEmail !== tokenEmail){
      //   return res.status(403).send({ message: "Forbidden Access" });
      // }

      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async(req, res) => {
      const user = req.body;
      user.role = 'customer';
      const email = user?.userEmail;
      const query = { userEmail: email };
      const existUser = await userCollection.findOne(query);
      if(existUser){
        return res.status(200).send({ message: "User already added on database" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/users/make-admin/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async(req, res) => {
      const email = req?.params?.email;
      const tokenEmail = req?.user?.email;

      if(email !== tokenEmail){
        return res.status(401).send({ message: 'Unauthorized Access' });
      }

      const query = { userEmail: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if(user){
        isAdmin = user?.role === 'admin';
      };
      res.send({ isAdmin });
    })


    // menu related apis
    app.get('/featured-menu', async (req, res) => {    // get featured-menu limit(6)
      const result = await menuCollection.find().limit(6).toArray();
      res.send(result);
    })

    app.get('/menu/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    })

    app.get('/menu', verifyToken, verifyAdmin, async (req, res) => {   // get all menu
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    app.post('/menu', verifyToken, verifyAdmin, async(req, res) => {
      const menu = req?.body;
      const result = await menuCollection.insertOne(menu);
      res.send(result);
    })

    app.put('/menu/:id', verifyToken, verifyAdmin, async(req, res) => {
      const menu = req.body;
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const updatedMenu = {
        $set: menu
      };
      const options = { upsert: true };
      const result = await menuCollection.insertOne(query, updatedMenu, options);
      res.send(result);
    })

    app.delete('/menu/:id', verifyToken, verifyAdmin, async(req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    })



    // testimonial related apis
    app.get('/testimonials', async (req, res) => {
      const result = await testimonialCollection.find().toArray();
      res.send(result);
    })



    // cart related apis
    app.get('/carts', async (req, res) => {
      const email = req?.query?.email;
      const query = { userEmail: email };
      const result = await cartCollection.find(query).toArray();

      // get all menuId
      const addedMenu = await Promise.all(
        result?.map(async item => {
          const { menuId, ...rest } = item;
          const existMenu = await menuCollection.findOne({ _id: new ObjectId(item?.menuId) });
          return {...existMenu, ...rest};
        })
      )

      res.send(addedMenu);
    })

    app.post('/carts', async (req, res) => {
      const menuItem = req?.body;
      const result = await cartCollection.insertOne(menuItem);
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req?.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })


    // logout related apis
    app.post('/logout', async(req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: false
      }).send({ success: true })
    })



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
  res.send('Bistro Boss server is running');
})

app.listen(port, () => {
  console.log('Bistro Boss server is running...');
})