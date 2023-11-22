const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.SECRETE_STRIPE_KEY);

/**
 * ! middleWere here
 *
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
    const paymentCollection = bistroDatabase.collection('payment');

    /**
     * ! jwt related api
     * ?
     */

    app.post('/jwt', async (request, response) => {
      const user = request.body;

      const token = jwt.sign(user, process.env.DB_SECRETE_KEY, {
        expiresIn: '365d',
      });

      response.status(200).send(token);
    });

    /**
     * ! custom middleware
     */

    const verifyToken = (request, response, next) => {
      const authorizationHeaders = request.headers.authorization;
      if (!authorizationHeaders) {
        response.status(401).send({ message: 'authorization forbidden' });
      }

      const token = request.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.DB_SECRETE_KEY, (error, decoded) => {
        if (error) {
          return response.status(402).send({ message: 'not verified' });
        }
        request.authorizationUser = decoded;
        next();
      });
    };

    const verifyAdmin = async (request, response, next) => {
      const email = request.authorizationUser.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';

      if (!isAdmin)
        return response.status(403).send({ message: 'not an admin access' });

      next();
    };

    /**
     * ! get method here
     */

    app.get('/menu', async (request, response) => {
      const cursor = menuCollection.find();
      const result = await cursor.toArray();
      response.status(200).send(result);
    });

    app.get('/menu/:id', async (request, response) => {
      const id = request.params.id;
      const query = { _id: id };
      const result = await menuCollection.findOne(query);
      response.send(result);
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

    app.get('/users', verifyToken, verifyAdmin, async (request, response) => {
      const result = await userCollection.find().toArray();
      response.status(200).send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (request, response) => {
      const email = request.params.email;
      const emailFromClient = request.authorizationUser.email;

      if (email !== emailFromClient) {
        return response.status(405).send({ message: 'unauthorized access' });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;

      if (user) {
        isAdmin = user?.role === 'admin';
      }

      response.send({ isAdmin });
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

    app.post('/menu', verifyToken, verifyAdmin, async (request, response) => {
      const menuItem = request.body;
      const result = await menuCollection.insertOne(menuItem);
      response.status(201).send(result);
    });

    /**
     * ! patch method
     */

    app.patch(
      '/users/admin/:id',
      verifyToken,
      verifyAdmin,
      async (request, response) => {
        const id = request.params.id;
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: 'admin',
          },
        };
        const result = await userCollection.updateOne(query, updatedDoc);
        response.status(200).send(result);
      }
    );

    app.patch('/menu/:id', async (request, response) => {
      const id = request.params.id;
      const items = request.body;

      const filter = { _id: id };
      const updatedDoc = {
        $set: {
          name: items.name,
          price: items.price,
          recipe: items.recipe,
          category: items.category,
          image: items.image,
        },
      };
      const result = await menuCollection.updateOne(filter, updatedDoc);
      response.send(result);
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

    app.delete(
      '/users/:id',
      verifyToken,
      verifyAdmin,
      async (request, response) => {
        const id = request.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        response.status(201).send(result);
      }
    );

    app.delete(
      '/menu/:id',
      verifyToken,
      verifyAdmin,
      async (request, response) => {
        const id = request.params.id;
        const query = { _id: new ObjectId(id) };

        const result = await menuCollection.deleteOne(query);
        response.status(202).send(result);
      }
    );

    /**
     * ! payment method here
     */

    app.post('/create-payment-intent', async (request, response) => {
      const { price } = request.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
      });
      response.send({ clientSecret: paymentIntent.client_secret });
    });

    // ! get here

    app.get('/payments/:email', verifyToken, async (request, response) => {
      const query = { email: request.params.email };
      if (request.params.email !== request.authorizationUser.email) {
        return response.status(404).send({ message: 'user not valid' });
      }
      const result = await paymentCollection.find(query).toArray();
      response.send(result);
    });

    // post here

    app.post('/payments', async (request, response) => {
      const payment = request.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartCollection.deleteMany(query);
      response.send({ paymentResult, deleteResult });
    });

    /**
     * ! admin stats here
     */

    app.get(
      '/admin-stats',
      verifyToken,
      verifyAdmin,
      async (request, response) => {
        const users = await userCollection.estimatedDocumentCount();
        const menuItems = await menuCollection.estimatedDocumentCount();
        const orders = await paymentCollection.estimatedDocumentCount();

        const result = await paymentCollection
          .aggregate([
            { $group: { _id: null, totalRevenue: { $sum: '$price' } } },
          ])
          .toArray();
        const revenue = result.length > 0 ? result[0].totalRevenue : 0;

        response.send({ users, menuItems, orders, revenue });
      }
    );

    app.get('/order-stats', async (request, response) => {
      const result = await paymentCollection
        .aggregate([
          { $unwind: '$menuItemIds' },
          {
            $lookup: {
              from: 'menuItem',
              localField: 'menuItemIds',
              foreignField: '_id',
              as: 'menuItems',
            },
          },
          { $unwind: '$menuItems' },
          {
            $group: {
              _id: '$menuItems.category',
              quantity: { $sum: 1 },
              totalRevenue: { $sum: '$menuItems.price' },
            },
          },
        ])
        .toArray();
      response.send(result);
    });

    /**
     * ? here i am showing the database connection message
     */

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
