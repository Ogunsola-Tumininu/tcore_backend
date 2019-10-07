const express = require('express');
const passport = require('passport')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
var multer = require('multer');
const morgan = require('morgan');
const bodyParser = require('body-parser')
const config = require('../config/database');
const User = require('../models/user');
const Customer = require('../models/customer');
const Appointment = require('../models/appointment');


const request = require('request')


const mailer = require('../config/mailer')
const sgMail = require('@sendgrid/mail');
const router = express.Router();
const cloudinary = require("cloudinary");
const cloudinaryConfig = require('../config/cloudinary')
const cloudinaryStorage = require("multer-storage-cloudinary");

const checkAuth = require('../middleware/check-auth');

const app = express()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

const url = 'http://127.0.0.1:4200'
// const url = 'https://careermeze-dev.herokuapp.com'

//register new user
router.post('/register', (req, res, next) => {
    let newUser = new User(req.body);
    User.addUser(newUser, (err, user) => {
        if (err) {
            if (err.errors) {
                if (err.errors.firstname) {
                    res.json({ success: false, msg: "Firstname must be at least 3 characters, max 50 ,should contain alpha-numeric characters" })
                }
                else if (err.errors.lastname) {
                    res.json({ success: false, msg: "Lastname must be at least 3 characters, max 50 ,should contain alpha-numeric characters" })
                }

                else if (err.errors.email) {
                    if (err.errors.email.kind == "unique") {
                        res.json({ success: false, msg: "Email already taken" })
                    }
                    else {
                        res.json({ success: false, msg: "Enter a valid email" })
                    }
                }
            }

            else {
                res.json({ success: false, msg: err.message })
                console.log(err)
            }
        }

        else {

            res.json({ success: true, msg: 'Account has been created successfully!', user: user })
        }

    })

})

//user login
router.post('/authenticate', (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    User.getUserByEmail(email, (err, user) => {
        if (err) throw err;
        if (!user) {
            return res.json({ success: false, msg: 'Oops! User not found' })
        }

        User.comparePassword(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (!isMatch) {
                return res.json({ success: false, msg: 'Wrong password' })
            }
            else {
                const token = jwt.sign(user.toJSON(), config.secret, {
                    expiresIn: 604800
                });

                res.json({
                    success: true,
                    token: token,
                    user: {
                        id: user._id,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        email: user.email,
                        role: user.role,
                        isAdmin: user.isAdmin,
                        active: user.active
                    }
                })
            }
        })
    })
});

//forgot password
router.post('/forgot-password', (req, res, next) => {
    const email = req.body.email

    //Find user by email
    User.getUserByEmail(email, (err, user) => {
        if (err) throw err;
        if (!user) {
            return res.json({ success: false, msg: 'Oops! No account with that email account exists' })
        }
        else if (!user.active) {
            return res.json({ success: false, msg: 'Account not Verified! Please check your email to verify your account!' })
        }
        else {
            user.requestReset = true;
            const resetToken = jwt.sign(user.toJSON(), config.secret, { expiresIn: 86400 })
            user.resetToken = resetToken
            user.save()
            sgMail.setApiKey(mailer.sendgrid_API);
            const msg = {
                to: email,
                from: 'admin@metricinternet.com',
                subject: 'Reset Your Password',
                text: 'Reset',
                html: `Hi,
                <br/><br/>
                Thanks for your request
                <br/><br/>
                Please follow the link below to reset your password
                <br/>
                <a href = ${url}/user/reset-password/${user.resetToken}> ${url}/user/reset-password </a>
                <br/><br/>
                If you did not request for a reset password, please disregard this email.
                <br/>
                Have a Pleasant Day!
                <br/>
                The CareerMeze Team
                `,
            };
            sgMail.send(msg);
            res.json({ success: true, msg: 'Please check you email for the reset password link' })
        }
    })
})


//Reset Password
router.post('/reset-password/:token', (req, res, next) => {
    const email = req.body.email
    const password = req.body.password

    User.getUserByEmail(email, (err, user) => {
        if (err) throw err;
        if (!user) {
            return res.json({ success: false, msg: 'Oops! No account with that email account exists' })
        }
        else if (!user.active) {
            return res.json({ success: false, msg: 'Account not Verified! Please check your email to verify your account!' })
        }
        else if (!user.requestReset && !user.resetToken) {
            return res.json({ success: false, msg: 'Invalid Request' })
        }
        else {
            var token = req.params.token
            var secret = config.secret
            jwt.verify(token, secret, function (err, decoded) {
                if (err) {
                    return res.json({ success: false, msg: 'Oops!Token has expired' })
                }
                else if (user.resetToken !== token) {
                    return res.json({ success: false, msg: 'Oops! Invalid Token' })
                }
                else {
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(password, salt, (err, hash) => {
                            if (err) throw err;
                            user.password = hash;
                            user.requestReset = false
                            user.resetToken = ''
                            user.save()
                        })
                        res.json({ success: true, msg: 'Password Reset was Successful' })
                    })
                }
            })
        }
    })
})

//Change Password
router.post('/change-password/:id', (req, res, next) => {
    const id = req.params.id;
    const password = req.body.password;
    const oldPassword = req.body.oldPassword;

    User.getUserById(id, (err, user) => {
        if (err) throw err;
        if (!user) {
            return res.json({ success: false, msg: 'Oops! No account with that id account exists' })
        }
        else {
            User.comparePassword(oldPassword, user.password, (err, isMatch) => {
                if (err) throw err;
                if (!isMatch) {
                    return res.json({ success: false, msg: 'The old password is not correct' })
                }
                else {
                    bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(password, salt, (err, hash) => {
                            if (err) throw err;
                            user.password = hash;
                            user.save()
                        })
                        res.json({ success: true, msg: 'Password change was Successful' })
                    })

                }
            })
        }
    })
})



// user profile
router.get('/profile', passport.authenticate('jwt', { session: false }), (req, res, next) => {
    res.json({ user: req.user });
});

// router.post('/profile', checkAuth, (req, res) => {
//     User.findById(req.body.id, (err, user) => {
//         if(!user){
//             res.status(400).send('oops! user not found')
//         }
//         else if (err){
//             res.status(400).send('Error finding user')
//             console.log(err.message)}
//         else
//             res.json({user: user});
//     });
// });

// fetch all user
router.route('/all').get((req, res) => {
    User.find((err, user) => {
        if (err) {
            res.status(400).send("Failed to get users")
            console.log(err.message)
        }
        else
            res.json(user);
    });
});


//Get all follow up users
router.route('/follow/all').get((req, res) => {
    User.find({ role: 'follow_up' }, (err, user) => {
        if (err) {
            res.status(400).send("Failed to get users")
            console.log(err.message)
        }
        else
            res.json(user);
    });
});

//Get all presenter  users
router.route('/presenter/all').get((req, res) => {
    User.find({ role: 'presenter' }, (err, user) => {
        if (err) {
            res.status(400).send("Failed to get users")
            console.log(err.message)
        }
        else
            res.json(user);
    });
});

//delete a user
router.route('/delete/:id').delete((req, res) => {
    User.findByIdAndRemove({ _id: req.params.id }, (err, user) => {
        if (!user) {
            res.status(400).send('oops! user not found')
        }
        else if (err) {
            res.status(400).send('Failed to remove user')
            console.log(err.message);
        }
        else
            res.json('User has been removed successfully');
    })
})

// update user role
router.route('/update/role/:id').put((req, res) => {
    User.findById(req.params.id)
        .exec(function (err, user) {
            if (!user) {
                res.status(400).send('oops! user not found')
            }
            else {
                user.role = req.body.role;

                user.save()
                    .then(user => {
                        res.json({ success: true, user: user });
                    })
                    .catch(err => {
                        res.status(400).send('Update failed')
                        console.log(err.message);
                    });
            }
        });
})


//Create customer
router.route('/customer/add').post((req, res) => {
    let customer = new Customer(req.body);
    customer.save(customer, (err, customer) => {
        if (err) {
            if (err.errors.name.kind == "unique") {
                res.json({ success: false, msg: "Customer Already Exist" })
            }
            else {
                res.json({ success: false, msg: err.message })
            }
        }
        else {
            res.json({ success: true, msg: 'Customer added successfully', customer: customer })
        }
    })

});


// fetch all customer
router.route('/customer/all').get((req, res) => {
    Customer.find((err, customers) => {
        if (err) {
            res.status(400).send("Failed to get customers")
            console.log(err.message)
        }
        else
            res.json({ success: true, customers: customers });
    });
});


//get a single property
router.route('/customer/:id').get((req, res) => {
    Customer.findById(req.params.id, (err, customer) => {
        if (!customer) {
            res.status(400).send('oops! customer not found')
        }
        else if (err) {
            res.status(400).send('Failed to get customer')
            console.log(err)
        }
        else
            res.json({ success: true, customer: customer });
    });
});


//Create cappointment
router.route('/appointment/add').post((req, res) => {
    let appointment = new Appointment(req.body);
    appointment.save(appointment, (err, appointment) => {
        if (err) {
            if (err.errors.name.kind == "unique") {
                res.json({ success: false, msg: "Appointment Already Exist" })
            }
            else {
                res.json({ success: false, msg: err.message })
            }
        }
        else {
            res.json({ success: true, msg: 'Appointment added successfully', appointment: appointment })
        }
    })

});


// fetch all appointment related to a customer
router.route('/appointment/customer/:cusId').get((req, res) => {
    Appointment.find({ "customer.id": req.params.cusId }, (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});

// fetch all appointment related to a follow up staff
router.route('/appointment/follow/:id').get((req, res) => {
    Appointment.find({
        $and: [
            { "followUp._id": req.params.id },
            { availability: false }
        ]
    }, (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});

// fetch all confirmed appointment of a follow up staff
router.route('/appointment/confirmed/:id').get((req, res) => {
    Appointment.find({
        $and: [
            { "followUp._id": req.params.id },
            { "appointmentSuccessful": false },
            { availability: true }
        ]
    }, (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});

// fetch all presented appointment of a follow up staff
router.route('/appointment/presented/:id').get((req, res) => {
    Appointment.find({
        $and: [
            { "followUp._id": req.params.id },
            { "appointmentSuccessful": true }
        ]
    }, (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});

// fetch all new scheduled appointment related to a presenter
router.route('/appointment/presenter/:id').get((req, res) => {
    Appointment.find({
        $and: [
            { "presenter._id": req.params.id },
            { "appointmentSuccessful": false }
        ]
    }, (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});

// fetch all new complete appointment related to a presenter
router.route('/appointment/presenter/presented/:id').get((req, res) => {
    Appointment.find({
        $and: [
            { "presenter._id": req.params.id },
            { "appointmentSuccessful": true }
        ]
    }, (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});


// update appointment
router.route('/update/appointment/:id').put((req, res) => {
    Appointment.findById(req.params.id)
        .exec(function (err, appointment) {
            if (!appointment) {
                res.status(400).send('oops! appointment not found')
            }
            else {
                appointment.site = req.body.site;
                appointment.project = req.body.project;
                appointment.property = req.body.property;
                appointment.viewDate = req.body.viewDate;
                appointment.followUp = req.body.followUp;
                appointment.remark = req.body.remark;
                appointment.save()
                    .then(appointment => {
                        res.json({ success: true, appointment: appointment });
                    })
                    .catch(err => {
                        res.status(400).send('Update failed')
                        console.log(err.message);
                    });
            }
        });
})


// confirm avalabity and appoint presenter of appointment
router.route('/update/appointment/available/confirm/:id').put((req, res) => {
    Appointment.findById(req.params.id)
        .exec(function (err, appointment) {
            if (!appointment) {
                res.status(400).send('oops! appointment not found')
            }
            else {
                appointment.availability = true;
                appointment.presenter = req.body.presenter;
                appointment.save()
                    .then(appointment => {
                        res.json({ success: true, appointment: appointment });
                    })
                    .catch(err => {
                        res.status(400).send('Update failed')
                        console.log(err.message);
                    });
            }
        });
})

// presentation report
router.route('/appointment/presentation/report/:id').put((req, res) => {
    Appointment.findById(req.params.id)
        .exec(function (err, appointment) {
            if (!appointment) {
                res.status(400).send('oops! appointment not found')
            }
            else {
                appointment.customerType = req.body.customerType;;
                appointment.presentationRemark = req.body.presentationRemark;
                appointment.appointmentSuccessful = true;
                appointment.save()
                    .then(appointment => {
                        res.json({ success: true, appointment: appointment });
                    })
                    .catch(err => {
                        res.status(400).send('Update failed')
                        console.log(err.message);
                    });
            }
        });
})


module.exports = router;