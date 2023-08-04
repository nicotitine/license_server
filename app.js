const express = require('express');
const mongoose = require("mongoose");
const Request = require("./models/request.model")
const bodyParser = require('body-parser');
const helmet = require("helmet")
require('dotenv').config();
const VERSION = process.env.VERSION

mongoose.connect(process.env.MONGO_DB_URL, { useNewUrlParser: true });

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet())

app.post('/new_request', async (req, res) => {
    console.log("New request from " + req.body.pseudo)
    const mac_address = req.body.mac_address;
    const data = await Request.findOne({'mac_address': mac_address});
    if (VERSION.localeCompare(req.body.v, undefined, {numeric: true, sensitivity: 'base'}) > 0) {
        res.send({_id: "-1"})
        return;
    }

    if(!data) {
        console.log("Request not found, creating a new one...")
        const request = await Request.create({
            pseudo: req.body.pseudo,
            'mac_address': mac_address,
            status: 'WAITING',
            v: req.body.v
        })
        res.send(request);
    } else {
        res.send(data);
        console.log("Request already exists, sending it...")
    }
})

async function getPseudoFromId(id) {
    const data = await Request.findOne({_id: id})
    if(data == undefined) return ''
    return data.pseudo
} 

app.get('/get_license', async (req, res, next) => {
    const mac_address = req.body.mac_address;
    const id = req.body.id;
    if (id == null || !id.match(/^[0-9a-fA-F]{24}$/)) {
        res.send(null);
        return;
      }
    const data = await Request.findOne({_id: id})
    if (!data) {
        res.send(data);
        return;
    }
    console.log("Get license request from " + data.pseudo)
    if (VERSION.localeCompare(req.body.v, undefined, {numeric: true, sensitivity: 'base'}) > 0) data.status = "UPDATE"
    if (mac_address !== data.mac_address) data.status = "FORBIDEN";
    res.send(data);
    console.log("License status: " + data.status)
})

module.exports = {app, getPseudoFromId};