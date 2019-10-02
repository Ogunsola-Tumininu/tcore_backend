const mongoose = require('mongoose');
const config = require('../config/database');


var uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;

//Site Schema
let projectSchema = new Schema({
    name: { type: String, required: true },
    type: [String],
    siteId: String,
    uploads: [{
        url: String,
        publicId: String
    }],
    
});
projectSchema.plugin(uniqueValidator, { message: 'Error, expected to be unique.'})
module.exports = mongoose.model('Project', projectSchema);