const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const port = 5000;
const uri = 'mongodb://localhost:27017';

const connectDB = async () => {
  try {
    await mongoose.connect(uri);

    const bistroDatabase = mongoose.connection.useDb('bistroDB');
    const menuCollection = bistroDatabase.collection('menuItem');
    const testimonialCollection = bistroDatabase.collection('testimonial');

    app.get('/menu', async (request, response) => {
      const cursor = menuCollection.find();
      const result = await cursor.toArray();
      response.status(200).send(result);
    });

    app.get('/reviews', async (request, response) => {
      const cursor = await testimonialCollection.find().toArray();
      response.status(200).send(cursor);
    });

    console.log('MongoDB is connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

app.get('/', async (request, response) => {
  response.send('successfully');
});

app.listen(port, async () => {
  console.log(`server is running at http://localhost:${port}`);
  await connectDB();
});
