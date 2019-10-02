const mongoose = require('mongoose');
const config = require('../config/database');


var uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;

//Appointment Schema
let appointmentSchema = new Schema({
    customer: { 
        name: String,
        id: String
     }, 
    site: { 
        name: String,
        _id: String
     },  
    project: { type: String }, 
    property: { type: String }, 
    viewDate: Date,
    followUp: { 
        name: String,
        _id: String
     },

     inputter: { 
        name: String,
        _id: String
     },

     presenter: { 
        name: String,
        _id: String
     },
    remark: { type: String }, 
    availability: {type: Boolean, default: false},
    customerType: String,
    appointmentSuccessful: {type: Boolean, default: false},
    offerIssued: {type: Boolean, default: false},
    presentationRemark: String,
    createdDate: { type: Date, default: Date.now()}
});
appointmentSchema.plugin(uniqueValidator, { message: 'Error, expected to be unique.'})
module.exports = mongoose.model('Appointment', appointmentSchema);