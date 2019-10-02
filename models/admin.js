const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/database');

var uniqueValidator = require('mongoose-unique-validator');
let adminUserSchema = mongoose.Schema({
    firstname: { type: String, required: true  },
    lastname: { type: String, required: true },
    name: { type: String },
    email: { type: String, required: true, unique: true },    
    password: { type: String, required: true },
    secretToken: {type: String},
    resetToken: {type: String},
    profileImage: {type: String},
    contact_no:{type:String},
    gender:{type:String},
    role: {type: String},
    type: { type: String, default: 'admin'},
    active: {type: Boolean},
    requestReset: {type: Boolean},
    registerDate: {type: Date, default:Date.now()},

});


adminUserSchema.plugin(uniqueValidator, { message: 'Error, expected to be unique.'});

let adminUser = module.exports = mongoose.model('adminUser', adminUserSchema);

module.exports.getUserById = function(id, callback) {
    adminUser.findById(id, callback);
}

module.exports.getUserByEmail = function(email, callback) {
    const query = {email: email}
    adminUser.findOne(query, callback);
}

module.exports.addUser = function(newadminUser, callback) {
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newadminUser.password, salt, (err, hash) => {
            if(err) throw err;
            newadminUser.password = hash;
            newadminUser.save(callback);
        });
    
    })
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
    bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
        if(err) throw err;
        callback(null, isMatch);
    })
}