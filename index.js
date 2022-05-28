const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rqtu0.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        await client.connect();
        const serviceCollection = client.db('tools_manufacturer').collection('products');
        const myCollection = client.db('tools_manufacturer').collection('myprofile');
        const reviewCollection = client.db('tools_manufacturer').collection("reviews");

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


        app.get('/products', async(req, res) =>{
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await serviceCollection.findOne(query);
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