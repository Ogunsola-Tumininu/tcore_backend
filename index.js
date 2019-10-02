const express = require('express');
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const path = require('path')
const passport = require('passport')

const config = require( './config/database')
const users = require('./routes/users');
const admin = require('./routes/admin');

var port = process.env.PORT || 8080;



//database connection

// mongoose.connect(config.local_database, {useNewUrlParser: true})
mongoose.connect(config.mlab_database, {useNewUrlParser: true})


//On Connection
mongoose.connection.on('connected', () => {
    console.log('Connected to database')
})

//On Disconnection
mongoose.connection.on('disconnected', () => {
    console.log('Disconnected from database')
})

//On Err
mongoose.connection.on('error', (err) => {
    console.log('Connection error: '+ err)
})

const app = express();
const router = express.Router();

app.use(cors());

//Set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());

app.use('/users', users);

app.use('/adminusers', admin);


app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);

app.get('/', (req, res) => {
    res.send('Invalid Endpoint')
})

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
})


app.use('/', router);

app.listen(port, () => console.log('Express server running on port ' + port));