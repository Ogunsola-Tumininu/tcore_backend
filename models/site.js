const mongoose = require('mongoose');
const config = require('../config/database');


var uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;

//Site Schema
let siteSchema = new Schema({
    name: { type: String, required: true, unique: true },
    location: {type: String, required: true },
    uploads: [{
        url: String,
        publicId: String
    }],
    // projects: [{
    //     name: {type: String},
    //     type: {type: String},
    //     uploads: [{
    //         url: String,
    //         publicId: String
    //     }],
    // }]
    
});
siteSchema.plugin(uniqueValidator, { message: 'Error, expected to be unique.'})
module.exports = mongoose.model('Site', siteSchema);