const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express()
const port = process.env.PORT || 5000;

const corsConfig = {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}

app.use(cors(corsConfig))
app.options("*", cors(corsConfig))
app.use(function (req, res, next) {
res.header("Access-Control-Allow-Origin", "*")
res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,authorization")
next()
})



app.use(express.json());

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rqtu0.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        await client.connect();
        const serviceCollection = client.db('tools_manufacturer').collection('products');
        const myCollection = client.db('tools_manufacturer').collection('myprofile');
        const reviewCollection = client.db('tools_manufacturer').collection("reviews");
        const orderCollection = client.db('tools_manufacturer').collection("orders");
        const usersCollection = client.db('tools_manufacturer').collection("users");
        const paymentCollection = client.db('tools_manufacturer').collection("payment");

        app.get('/myprofile', async (req, res) => {
            const users = await myCollection.find().toArray();
            res.send(users);

        });
        app.get('/myprofile/:email', async (req, res) => {
            const id = req.params.email;
            console.log(req.body)
            const query = { email: id };
            const result = await myCollection.findOne(query);
            res.send(result);
        });
        app.put('/myprofile/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    education: user.education,
                    location: user.locations,
                    phoneNumber: user.phoneNumber,
                    linkedIn: user.linkedIn,
                },

            };

            const result = await myCollection.updateOne(filter, updateDoc, options);
            res.send(result);

        });


        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        app.post('/reviews', async (req, res) => {
            const newUser = req.body;
            console.log(newUser);
            const result = await reviewCollection.insertOne(newUser);
            res.send(result);

        });


        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users);

        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });


        });

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };

                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden' });
            }


        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
              $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
          });



          app.get('/products', async (req, res) => {

            const query = {};
            const cursor = serviceCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);

        });

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await serviceCollection.findOne(query);
            res.send(result);
        });

        app.get('/allproducts', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);

        });

        app.post('/products', async (req, res) => {
            const newUser = req.body;
            console.log(newUser);
            const result = await serviceCollection.insertOne(newUser);
            res.send(result);



        });


        app.delete('/allproducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await serviceCollection.deleteOne(query);
            res.send(result);
        });


        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body;
            console.log(service)
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            console.log(paymentIntent.client_secret)
            res.send({ clientSecret: paymentIntent.client_secret })
        });


        app.get('/order', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);

        });
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });


        app.get('/order/:id', verifyJWT, async(req, res) =>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await orderCollection.findOne(query);
            res.send(order);
          })


        


        app.get('/myorder', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const addusers = await cursor.toArray();
                res.send(addusers);
            }
            else {
                res.status(403).send({ message: 'forbidden access' });
            }
        });

        app.get('/myorder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order);
        })


        app.patch('/myorder/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);

        })

        app.post('/order', async (req, res) => {
            const newUser = req.body;
            console.log(newUser);
            const result = await orderCollection.insertOne(newUser);
            res.send(result);

        
        });

    }
    finally{

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})