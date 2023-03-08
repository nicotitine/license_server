const express = require('express');
const mongoose = require("mongoose");
const Request = require("./models/request.model")
const bodyParser = require('body-parser');
const helmet = require("helmet")

const dev_db_url = "mongodb+srv://sbstats:adec594ea@cluster0.0rllv.mongodb.net/grobe_license?retryWrites=true&w=majority"
const mongoDB = process.env.MONGODB_URI || dev_db_url;

console.log(process.env.MONGODB_URI)

mongoose.connect(mongoDB, { useNewUrlParser: true });
 

const app = express();

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet())

mongoose.connection.on("open", async function(ref) {
   const data = await Request.findOne({pseudo: 'ronce'})
   console.log(data);
  });

app.post('/new_request', async (req, res) => {
    console.log(req.body);
    const mac_address = req.body.mac_address
    const data = await Request.findOne({'mac_address': mac_address})
    if(!data) {
        const request = await Request.create({
            pseudo: req.body.pseudo,
            'mac_address': mac_address,
            status: 'WAITING'
        })
        res.send(request)
    } else res.send(data)
})

app.get('/get_license', async (req, res) => {
    const mac_address = req.body.mac_address;
    const id = req.body.id
    const data = await Request.findOne({_id: id})
    res.send(data)
})

module.exports = app;