const mongoose = require('mongoose');
const config = require('../config/database');


var uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;

//Property Schema
let propertySchema = new Schema({
    name: { type: String, required: true, unique: true },
    site: {
        siteId: String,
        siteName: String
    } ,
    project_name: String,
    project_type: String,
    house_type: String,
    unit: String,
    cost: String,
    floor_uploads: [{
        url: String,
        publicId: String
    }],
    d_uploads: [{
        url: String,
        publicId: String
    }],
    site_uploads: [{
        url: String,
        publicId: String
    }],
    deactivate:{type:Boolean, default: false}
    
});
propertySchema.plugin(uniqueValidator, { message: 'Error, expected to be unique.'})
module.exports = mongoose.model('Property', propertySchema);