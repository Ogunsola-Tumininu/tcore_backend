const mongoose = require('mongoose');
const config = require('../config/database');


var uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;

//Customer Schema
let customerSchema = new Schema({
    name: { type: String, unique: true, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    email: { type: String },  
});
customerSchema.plugin(uniqueValidator, { message: 'Error, expected to be unique.'})
module.exports = mongoose.model('Customer', customerSchema);