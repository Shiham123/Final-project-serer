const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

/**
 * ! middle were
 *  ? here
 */

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

/**
 * ! uri here
 */
const uri = 'mongodb://localhost:27017';
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster-one.varjcyv.mongodb.net/?retryWrites=true&w=majority`;

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

    /**
     * ! get method here
     */

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

    app.get('/users', async (request, response) => {
      const result = await userCollection.find().toArray();
      response.status(200).send(result);
    });

    /**
     * ! post method here
     */

    app.post('/carts', async (request, response) => {
      const cartItem = request.body;
      const result = await cartCollection.insertOne(cartItem);
      response.send(result);
    });

    app.post('/users', async (request, response) => {
      const user = request.body;
      const query = { email: user.email };

      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return response
          .status(404)
          .send({ message: 'user exits ', insertedId: null });
      }

      const result = await userCollection.insertOne(user);
      response.status(200).send(result);
    });

    /**
     * ! patch method
     */

    app.patch('/users/admin/:id', async (request, response) => {
      const id = request.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin',
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      response.status(200).send(result);
    });

    /**
     * ! delete method here
     */

    app.delete('/carts/:id', async (request, response) => {
      const id = request.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      response.send(result);
    });

    app.delete('/users/:id', async (request, response) => {
      const id = request.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      response.status(201).send(result);
    });

    await client.db('admin').command({ ping: 1 });
    console.log('You successfully connected to MongoDB!');
  } catch (error) {
    console.dir(error);
  }
};
run();

/**
 * ! default setting
 */

app.get('/', async (request, response) => {
  response.send('successfully connected');
});

app.listen(port, () => {
  console.log(`server is running at http://localhost:${port}`);
});
