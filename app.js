var fs = require('fs');
const express = require('express');
const mongoose = require("mongoose");
const Request = require("./models/request.model")
const bodyParser = require('body-parser');
const helmet = require("helmet")
const nacl = require("tweetnacl");
const utils = require("tweetnacl-util");
const encodeBase64 = utils.encodeBase64;
require('dotenv').config();
const VERSION = process.env.VERSION

mongoose.connect(process.env.MONGO_DB_URL, { useNewUrlParser: true });

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet())

app.post('/new_request', async (req, res) => {
	const pseudo = req.body.pseudo
	const mac_address = req.body.mac_address;
	try {
		const data = await Request.findOne({ 'mac_address': mac_address });
		log("New request from " + pseudo)
		if (VERSION.localeCompare(req.body.v, undefined, { numeric: true, sensitivity: 'base' }) > 0) {
			res.send({ _id: "-1" })
			return;
		}

		if (!data) {
			log("Request not found, creating a new one...")
			const request = await Request.create({
				pseudo: req.body.pseudo,
				'mac_address': mac_address,
				status: 'WAITING',
				v: req.body.v
			})
			res.send(request);
		} else {
			res.send(data);
			log("Request already exists, sending it...")
		}
	} catch (e) {
		printError('Unable to create new license for ' + pseudo + ", " + mac_address)
		res.send({error: "unable to create request"})
	}
})

async function getPseudoFromId(id) {
	const data = await Request.findOne({ _id: id })
	if (data == undefined) return ''
	return data.pseudo
}

function log(text) {
	console.log(new Date().toJSON() + '\t' + text)
}

function printError(text) {
	console.error(new Date().toJSON() + '\t' + text)
}

app.get('/get_groups_list', async (req, res, next) => {
	const id = req.body.id;
	try {
		log("Getting group list from " + id)
		const version = req.body.v;
		if (id == null || !id.match(/^[0-9a-fA-F]{24}$/)) {
			res.send(null);
			return;
		}
		const data = await Request.findOne({ _id: id })
		if (!data) {
			res.send(data);
			return;
		}
		let version_log = ''
		if (version.localeCompare(data.v, undefined, {numeric: true, sensitivity: 'base'}) > 0) {
			version_log = ' | Update from ' + data.v + ' to ' + version + ' detected'
			data.v = version
			data.save()
		}
		if (VERSION.localeCompare(version, undefined, { numeric: true, sensitivity: 'base' }) > 0) {
			data.status = "UPDATE"
			res.send(data)
		}
		const obj = JSON.parse(fs.readFileSync('./groups.json', 'utf8'));
		res.send(obj)
	} catch (e) {
		printError("Unable to get group list from " + id)
		res.send({error: "unable to fetch group list"})
	}
})

app.get('/get_discord_list', async (req, res, next) => {
	const id = req.body.id;
	try {
		log("Getting discord list from " + id)
		const version = req.body.v
		if (id == null || !id.match(/^[0-9a-fA-F]{24}$/)) {
			res.send(null);
			return;
		}
		const data = await Request.findOne({_id: id})
		if (!data) {
			res.send(data)
			return
		}
		let version_log = ''
		if (version.localeCompare(data.v, undefined, {numeric: true, sensitivity: 'base'}) > 0) {
			version_log = ' | Update from ' + data.v + ' to ' + version + ' detected'
			data.v = version
			data.save()
		}
		if (VERSION.localeCompare(version, undefined, { numeric: true, sensitivity: 'base' }) > 0) {
			data.status = "UPDATE"
			res.send(data)
		}
		try {
			const version = req.body.v;
			log(`Getting discord list from v${version}`);
			const obj = JSON.parse(fs.readFileSync("./discord.json", "utf8"));
			const data = {
			  token: process.env.DISCORD_TOKEN,
			  channels: obj,
			};
			const encrypted = encrypt(JSON.stringify(data));
			res.send(encrypted);
		  } catch (e) {
			printError("Unable to get discord list");
			printError(e);
			res.send({ error: "unable to fetch discord list" });
		  }
	} catch (e) {
		printError("Unable to get discord list from " + id)
		res.send({error: "unable to fetch discord list"})
	}
})

app.get('/get_license', async (req, res, next) => {
	const mac_address = req.body.mac_address;
	const id = req.body.id;
	const version = req.body.v;
	try {
		if (id == null || !id.match(/^[0-9a-fA-F]{24}$/)) {
			res.send(null);
			return;
		}
		const data = await Request.findOne({ _id: id })
		if (!data) {
			res.send(data);
			return;
		}
		let version_log = ''
		if (version.localeCompare(data.v, undefined, {numeric: true, sensitivity: 'base'}) > 0) {
			version_log = ' | Update from ' + data.v + ' to ' + version + ' detected'
			data.v = version
			data.save()
		}
		if (VERSION.localeCompare(version, undefined, { numeric: true, sensitivity: 'base' }) > 0) data.status = "UPDATE"
		if (mac_address !== data.mac_address) data.status = "FORBIDEN";
		res.send(data);
		log("Get license request from " + data.pseudo + ' | License status: ' + data.status + version_log)
	} catch (e) {
		printError("Unable to get license from " + id + ", " + mac_address + ", " + version)
		res.send({error: "unable to fetch license"})
	}
})

function encrypt(data) {
	const nonce = nacl.randomBytes(24);
	const secretKey = Buffer.from(process.env.SEED, "utf-8");
	const sData = Buffer.from(data, "utf-8");
	const encrypted = nacl.secretbox(sData, nonce, secretKey);
	return `${encodeBase64(nonce)}:${encodeBase64(encrypted)}`;
  }

module.exports = { app, getPseudoFromId, log, printError };