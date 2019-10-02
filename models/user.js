const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/database');
const randomstring = require('randomstring');
var fs = require('fs');

var uniqueValidator = require('mongoose-unique-validator');
var validate = require('mongoose-validator')
var defaultValues = require('mongoose-default-values')


var nameValidator = [
  validate({
    validator: 'isLength',
    arguments: [3, 50],
  }),
  validate({
    validator: 'isAlphanumeric',
    passIfEmpty: true,
  }),
]

var emailValidator = [
    validate({
        validator: 'matches',
        arguments: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    }),
    validate({
        validator: 'isLength',
        arguments: [3, 40],
    })
];

var passwordValidator = [
    validate({
        validator: 'matches',
        arguments: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/,
        msg: 'Password needs to have at least one lower case, one uppercase, one number, one special character, and must be at least 8 characters but no more than 35.'
    }),
    // validate({
    //     validator: 'isLength',
    //     arguments: [8, 35],
    //     message: 'Password should be between {ARGS[0]} and {ARGS[1]} characters'
    // })
];

let UserSchema = mongoose.Schema({
    firstname: { type: String, required: true, validate: nameValidator },
    lastname: { type: String, required: true, validate: nameValidator },
    name: { type: String },
    email: { type: String, required: true, unique: true,  validate: emailValidator },    
    password: { type: String, required: true, validate: passwordValidator },
    secretToken: {type: String},
    resetToken: {type: String},
    profileImage: {type: String},
    dob: {type: Date},
    contact_no:{type:String},
    gender:{type:String},
    role: {type: String},
    type: { type: String, default: 'user'},
    active: {type: Boolean},
    requestReset: {type: Boolean},
    registerDate: {type: Date, default:Date.now()},
    
});

UserSchema.plugin(uniqueValidator, { message: 'unique'});
UserSchema.plugin(defaultValues);

let User = module.exports = mongoose.model('User', UserSchema);

module.exports.getUserById = function(id, callback) {
    User.findById(id, callback);
}

module.exports.getUserByEmail = function(email, callback) {
    const query = {email: email}
    User.findOne(query, callback);
}

module.exports.getUserByToken = function(secretToken, callback) {
    const query = {secretToken: secretToken}
    User.findOne(query, callback);
}
module.exports.getUserByResetToken = function(resetToken, callback) {
    const query = {resetToken: resetToken}
    User.findOne(query, callback);
}

module.exports.addUser = function(newUser, callback) {
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
            if(err) throw err;
            newUser.password = hash;

            //generate secret token
            const secretToken = jwt.sign(newUser.toJSON(), config.secret, {expiresIn: 86400})
            newUser.secretToken = secretToken

            //flag user as inactive
            newUser.active = false;

            //save user
            newUser.save(callback);
        });
    
    })
}


module.exports.comparePassword = function(candidatePassword, hash, callback){
    bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
        if(err) throw err;
        callback(null, isMatch);
    })
}