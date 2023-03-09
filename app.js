const express = require('express');
const mongoose = require("mongoose");
const Request = require("./models/request.model")
const bodyParser = require('body-parser');
const helmet = require("helmet")
require('dotenv').config();

mongoose.connect(process.env.MONGO_DB_URL, { useNewUrlParser: true });
 

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet())

mongoose.connection.on("open", async function(ref) {

});

app.post('/new_request', async (req, res) => {
    console.log(req.body);
    const mac_address = req.body.mac_address;
    const data = await Request.findOne({'mac_address': mac_address});
    if(!data) {
        const request = await Request.create({
            pseudo: req.body.pseudo,
            'mac_address': mac_address,
            status: 'WAITING'
        })
        res.send(request);
    } else res.send(data);
})

app.get('/get_license', async (req, res, next) => {
    const mac_address = req.body.mac_address;
    const id = req.body.id;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.send(null);
        return;
      }
    const data = await Request.findOne({_id: id})
    if (!data) {
        res.send(data);
        return;
    }
    if (mac_address !== data.mac_address) data.status = "FORBIDEN";
    res.send(data);
})

module.exports = app;