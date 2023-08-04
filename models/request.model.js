const mongoose = require("mongoose");

const requestSchema = mongoose.Schema({
    pseudo: {
        type: String,
        unique: false,
        required: true,
    },
    mac_address: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ["WAITING", "VALIDATED", "REVOKED"],
        default: "WAITING",
        required: true
    },
    v: {
        type: String,
        unique: false,
        required: true
    }
});

const Request = mongoose.model("Request", requestSchema);
module.exports = Request
