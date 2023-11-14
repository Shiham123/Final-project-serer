const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const port = 5000;
const uri = 'mongodb://localhost:27017';
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster-one.varjcyv.mongodb.net/?retryWrites=true&w=majority`;

let menuCollection;
let testimonialCollection;
let cartCollection;

const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    const bistroDatabase = mongoose.connection.useDb('bistroDB');
    menuCollection = bistroDatabase.collection('menuItem');
    testimonialCollection = bistroDatabase.collection('testimonial');
    cartCollection = bistroDatabase.collection('cartItem');
    console.log('MongoDB is connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

app.get('/menu', async (request, response) => {
  try {
    const cursor = menuCollection.find();
    const result = await cursor.toArray();
    response.status(200).send(result);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/reviews', async (request, response) => {
  try {
    const cursor = await testimonialCollection.find().toArray();
    response.status(200).send(cursor);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    response.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/carts', async (request, response) => {
  try {
    const cursor = await cartCollection.find().toArray();
    response.status(200).send(cursor);
  } catch (error) {
    response.status(402).send({ error: 'cart form server error' });
  }
});

app.post('/carts', async (request, response) => {
  try {
    const cartItem = request.body;
    const result = await cartCollection.insertOne(cartItem);
    response.status(200).send(result);
  } catch (error) {
    console.log('add to cart error', error);
    response.status(404).send({ error: 'add to cart section error' });
  }
});

app.get('/', async (request, response) => {
  response.send('successfully');
});

app.listen(port, async () => {
  console.log(`server is running at http://localhost:${port}`);
  await connectDB();
});
