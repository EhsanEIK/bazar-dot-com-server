const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());

// verify token
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "unauthorized access" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rwmjrnt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const usersCollection = client.db('bazarDotComDB').collection('users');
        const productsCollection = client.db('bazarDotComDB').collection('products');

        // jwt
        app.post('/jwt', (req, res) => {
            const userInfo = req.body;
            const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
            res.send({ token });
        })

        // users [GET]
        app.get('/users', verifyJWT, async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        // users [POST]
        app.post('/users', verifyJWT, async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // users [PUT- make admin]
        app.put('/users/makeAdmin', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role === 'admin' || user?.role === 'moderator') {
                return;
            }
            const options = { upsert: true };
            const makeAdmin = {
                $set: {
                    role: "admin"
                }
            }
            const result = await usersCollection.updateOne(query, makeAdmin, options);
            res.send(result);
        })

        // users [PUT- make moderator]
        app.put('/users/makeModerator', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user?.role === 'moderator' || user?.role === 'admin') {
                return;
            }
            const options = { upsert: true };
            const makeModerator = {
                $set: {
                    role: "moderator"
                }
            }
            const result = await usersCollection.updateOne(query, makeModerator, options);
            res.send(result);
        })

        // products [GET]
        app.get('/products', async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        // products [GET single product]
        app.get('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        })

        // products [POST]
        app.post('/products', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        // products [PUT]
        app.put('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const product = req.body;
            const updateProduct = {
                $set: {
                    name: product.name,
                    price: product.price,
                }
            };
            const result = await productsCollection.updateOne(filter, updateProduct, options);
            res.send(result);
        })

        // products [DELETE]
        app.delete('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })


    }
    finally { }
}
run().catch(error => console.error(error));

app.get('/', (req, res) => {
    res.send('Bazar dot com server is running');
})

app.listen(port, () => console.log("Server is running on port:", port));