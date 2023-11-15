const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

app.use(cors());
app.use(express.json());

const port = 5000;

const uri = 'mongodb://localhost:27017';

// const uri =
//   'mongodb+srv://<username>:<password>@cluster-one.varjcyv.mongodb.net/?retryWrites=true&w=majority';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    // await client.connect();
    const bistroDatabase = client.db('bistroDB');
    const menuCollection = bistroDatabase.collection('menuItem');
    const testimonialCollection = bistroDatabase.collection('testimonial');
    const cartCollection = bistroDatabase.collection('cartItem');
    const userCollection = bistroDatabase.collection('userCl');

    app.get('/menu', async (request, response) => {
      const cursor = menuCollection.find();
      const result = await cursor.toArray();
      response.status(200).send(result);
    });

    app.get('/reviews', async (request, response) => {
      const cursor = testimonialCollection.find();
      const result = await cursor.toArray();
      response.status(200).send(result);
    });

    app.get('/carts', async (request, response) => {
      const email = request.query.email;
      const query = { loggedInUser: email };
      const options = { sort: { price: 1 } };
      const cursor = await cartCollection.find(query, options).toArray();
      response.send(cursor);
    });

    app.post('/carts', async (request, response) => {
      const cartItem = request.body;
      const result = await cartCollection.insertOne(cartItem);
      response.send(result);
    });

    app.post('/users', async (request, response) => {
      const user = request.body;
      console.log(user);
    });

    app.delete('/carts/:id', async (request, response) => {
      const id = request.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      response.send(result);
    });

    await client.db('admin').command({ ping: 1 });
    console.log('You successfully connected to MongoDB!');
  } catch (error) {
    console.dir(error);
  }
};
run();

app.get('/', async (request, response) => {
  response.send('successfully connected');
});

app.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});
