const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/database');
const adminUser = require('../models/admin');
const Site = require('../models/site');
const Project = require('../models/project');
const Property = require('../models/property');
const Appointment = require('../models/appointment');
const admin = require('../routes/admin');

var multer = require('multer');
const fs = require('fs')
const csvToJson = require('convert-csv-to-json');

const sgMail = require('@sendgrid/mail');
const mailer = require('../config/mailer');

const router = express.Router();

const cloudinary = require("cloudinary");
const cloudinaryConfig = require('../config/cloudinary')
const cloudinaryStorage = require("multer-storage-cloudinary");

const url = 'http://127.0.0.1:4200'
// const url = 'https://careermeze-dev.herokuapp.com'

//Admin Registration
router.post('/register', (req, res, next) => {
    let newadminUser = new adminUser(req.body);
    adminUser.addUser(newadminUser, (err, adminuser) => {
        if (err) {
            res.json({ success: false, msg: err.message })
        }
        else {
            res.json({ success: true, msg: 'Admin added successfully' })
        }
    })
})

//Admin login
router.post('/authenticate', (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    adminUser.getUserByEmail(email, (err, adminuser) => {
        if (err) throw err;
        if (!adminuser) {
            return res.json({ success: false, msg: 'User not found' })
        }

        adminUser.comparePassword(password, adminuser.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                const token = jwt.sign(adminuser.toJSON(), config.secret, {
                    expiresIn: 604800
                });

                res.json({
                    success: true,
                    token: token,
                    user: {
                        id: adminuser._id,
                        firstname: adminuser.firstname,
                        lastname: adminuser.lastname,
                        email: adminuser.email,
                        role: adminuser.role,
                        type: adminuser.type
                    }
                })
            }
            else {
                return res.json({ success: false, msg: 'Wrong password' })
            }
        })
    })
});

//forgot password
router.post('/forgot-password', (req, res, next) => {
    const email = req.body.email

    //Find user by email
    adminUser.getUserByEmail(email, (err, admin) => {
        if (err) throw err;
        if (!admin) {
            return res.json({ success: false, msg: 'Oops! No account with that email account exists' })
        }
        else {
            admin.requestReset = true;
            const resetToken = jwt.sign(admin.toJSON(), config.secret, { expiresIn: 86400 })
            admin.resetToken = resetToken
            admin.save()
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
                <a href = ${url}/admin/reset-password/${admin.resetToken}> ${url}/admin/reset-password </a>
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

    adminUser.getUserByEmail(email, (err, user) => {
        if (err) throw err;
        if (!user) {
            return res.json({ success: false, msg: 'Oops! No account with that email account exists' })
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

//Get Profile
router.get('/profile', passport.authenticate('jwt', { session: false }), (req, res, next) => {
    res.json({ user: req.user });
});

//Get all Admin users
router.route('/all').get((req, res) => {
    adminUser.find((err, adminUser) => {
        if (err) {
            res.status(400).send("Failed to get users")
            console.log(err.message)
        }
        else
            res.json(adminUser);
    });
});


//Create site
router.route('/site/add').post((req, res) => {
    let site = new Site(req.body);
    site.save(site, (err, site) => {
        if (err) {
            if (err.errors.name.kind == "unique") {
                res.json({ success: false, msg: "Site Already Exist" })
            }
            else {
                res.json({ success: false, msg: err.message })
            }
        }
        else {
            res.json({ success: true, msg: 'Site added successfully', site: site })
        }
    })

});



// fetch all sites
router.route('/site/all').get((req, res) => {
    Site.find((err, site) => {
        if (err) {
            res.status(400).send("Failed to get sites")
            console.log(err.message)
        }
        else
            res.json({ success: true, site: site });
    });
});

//get a single site
router.route('/site/:id').get((req, res) => {
    Site.findById(req.params.id, (err, site) => {
        if (!site) {
            res.status(400).send('oops! site not found')
        }
        else if (err) {
            res.status(400).send('Failed to get site')
            console.log(err)
        }
        else
            res.json({ success: true, site: site });
    });
});


//delete a site
router.route('/delete/site/:id').delete((req, res) => {
    Site.findByIdAndRemove({ _id: req.params.id }, (err, site) => {
        if (!site) {
            res.status(400).send('oops! site not found')
        }
        else if (err) {
            res.status(400).send('Failed to remove site')
            console.log(err.message);
        }
        else
            res.json({ success: true, mgs: "Site has been deleted succefully" });
    })
})


// update site
router.route('/update/site/:id').put((req, res) => {
    Site.findById(req.params.id)
        .exec(function (err, site) {
            if (!site) {
                res.status(400).send('oops! site not found')
            }
            else {
                site.name = req.body.name;
                site.location = req.body.location;
                // site.uploads = req.body.uploads;
                site.save()
                    .then(site => {
                        res.json({ success: true, site: site });
                    })
                    .catch(err => {
                        res.status(400).send('Update failed')
                        console.log(err.message);
                    });
            }
        });
})

// add site picture to cloudinary
cloudinary.config({
    cloud_name: cloudinaryConfig.cloud_name,
    api_key: cloudinaryConfig.api_key,
    api_secret: cloudinaryConfig.api_secret
});
const siteStorage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: "sites",
    allowedFormats: ["jpg", "png"],
    // transformation: [{ width: 500, height: 500, crop: "limit" }]
});
const siteParser = multer({ storage: siteStorage });
const siteUpload = siteParser.single("img")

router.post('/site/upload/:id', (req, res) => {
    Site.findById(req.params.id)
        .exec(function (err, site) {
            if (!site) {
                res.status(400).send('oops! site not found')
            }
            else {
                siteUpload(req, res, function (err) {
                    if (err) {
                        res.json({ success: false, message: err.message })
                    }
                    else {
                        let image = {};
                        image.url = req.file.secure_url;
                        image.publicId = req.file.public_id;
                        site.uploads.push(image)
                        site.save()
                        res.json({ success: true, message: "Image uploaded successfully", siteUrl: image })
                    }
                })
            }
        })
});


// add project layouts to cloudinary
const projectStorage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: "projects",
    allowedFormats: ["jpg", "png"],
    // transformation: [{ width: 500, height: 500, crop: "limit" }]
});
const projectParser = multer({ storage: projectStorage });
const projectUpload = projectParser.single("img")

router.post('/project/upload/:id', (req, res) => {
    Project.findById(req.params.id)
        .exec(function (err, project) {
            if (!project) {
                res.status(400).send('oops! project not found')
            }
            else {
                projectUpload(req, res, function (err) {
                    if (err) {
                        res.json({ success: false, message: err.message })
                    }
                    else {
                        let image = {};
                        image.url = req.file.secure_url;
                        image.publicId = req.file.public_id;
                        project.uploads.push(image)
                        project.save()
                        res.json({ success: true, message: "Project layout uploaded successfully", projectUrl: image })
                    }
                })
            }
        })
});


//Create project
router.route('/project/add').post((req, res) => {
    let project = new Project(req.body);
    project.save(project, (err, project) => {
        if (err) {
            if (err.errors.name.kind == "unique") {
                res.json({ success: false, msg: "Project Already Exist" })
            }
            else {
                res.json({ success: false, msg: err.message })
            }
        }
        else {
            res.json({ success: true, msg: 'Project added successfully', project: project })
        }
    })

});


// fetch all projects related to a site
router.route('/site/:siteId/project').get((req, res) => {
    Project.find({ siteId: req.params.siteId }, (err, projects) => {
        if (err) {
            res.status(400).send("Failed to get project")
            console.log(err.message)
        }
        else
            res.json({ success: true, projects: projects });
    });
});



//get a single project
router.route('/project/:id').get((req, res) => {
    Project.findById(req.params.id, (err, project) => {
        if (!project) {
            res.status(400).send('oops! project not found')
        }
        else if (err) {
            res.status(400).send('Failed to get project')
            console.log(err)
        }
        else
            res.json({ success: true, project: project });
    });
});

//delete a project
router.route('/delete/project/:id').delete((req, res) => {
    Project.findByIdAndRemove({ _id: req.params.id }, (err, project) => {
        if (!project) {
            res.status(400).send('oops! project not found')
        }
        else if (err) {
            res.status(400).send('Failed to remove project')
            console.log(err.message);
        }
        else
            res.json({ success: true, mgs: "Project has been deleted successfully" });
    })
})


// update project
router.route('/update/project/:id').put((req, res) => {
    Project.findById(req.params.id)
        .exec(function (err, project) {
            if (!project) {
                res.status(400).send('oops! project not found')
            }
            else {
                project.name = req.body.name;
                project.type = req.body.type;
                project.save()
                    .then(project => {
                        res.json({ success: true, project: project });
                    })
                    .catch(err => {
                        res.status(400).send('Update failed')
                        console.log(err.message);
                    });
            }
        });
})

// fetch all projects related to a name
router.route('/site/project/type').post((req, res) => {
    Project.findOne({ name: req.body.name }, (err, projects) => {
        if (err) {
            res.status(400).send("Failed to get project")
            console.log(err.message)
        }
        else
            res.json({ success: true, projects: projects });
    });
});


//Create property
router.route('/property/add').post((req, res) => {
    let property = new Property(req.body);
    property.save(property, (err, property) => {
        if (err) {
            if (err.errors.name.kind == "unique") {
                res.json({ success: false, msg: "Property Already Exist" })
            }
            else {
                res.json({ success: false, msg: err.message })
            }
        }
        else {
            res.json({ success: true, msg: 'Property added successfully', property: property })
        }
    })

});

// update project
router.route('/update/property/:id').put((req, res) => {
    Property.findById(req.params.id)
        .exec(function (err, property) {
            if (!property) {
                res.status(400).send('oops! property not found')
            }
            else {
                property.name = req.body.name;
                property.site = req.body.site;
                property.project_name = req.body.project_name;
                property.project_type = req.body.project_type;
                property.house_type = req.body.house_type;
                property.unit = req.body.unit;
                property.cost = req.body.cost;
                property.save()
                    .then(property => {
                        res.json({ success: true, property: property });
                    })
                    .catch(err => {
                        res.status(400).send('Update failed')
                        console.log(err.message);
                    });
            }
        });
})


// fetch all property related to a site
router.route('/property/all').get((req, res) => {
    Property.find({deactivate: false},(err, properties) => {
        if (err) {
            res.status(400).send("Failed to get property")
            console.log(err.message)
        }
        else
            res.json({ success: true, properties: properties });
    });
});


//get a single property
router.route('/property/:id').get((req, res) => {
    Property.findById(req.params.id, (err, property) => {
        if (!property) {
            res.status(400).send('oops! property not found')
        }
        else if (err) {
            res.status(400).send('Failed to get property')
            console.log(err)
        }
        else
            res.json({ success: true, property: property });
    });
});

//delete a property
router.route('/delete/property/:id').delete((req, res) => {
    Property.findById(req.params.id, (err, property) => {
        if (!property) {
            res.status(400).send('oops! project not found')
        }
        else if (err) {
            res.status(400).send('Failed to remove property')
            console.log(err.message);
        }
        else {
            property.deactivate = true;
            property.save();
            res.json({ success: true, mgs: "property has been deleted successfully" });
        }
    })
})

// fetch all properties related to a site
router.route('/site/:siteId/property').get((req, res) => {
    Property.find({ "site.siteId": req.params.siteId }, (err, properties) => {
        if (err) {
            res.status(400).send("Failed to get property")
            console.log(err.message)
        }
        else
            res.json({ success: true, properties: properties });
    });
});

// add property layouts to cloudinary
const propertyStorage = cloudinaryStorage({
    cloudinary: cloudinary,
    folder: "property",
    allowedFormats: ["jpg", "png"],
    // transformation: [{ width: 500, height: 500, crop: "limit" }]
});
const propertyParser = multer({ storage: propertyStorage });
const propertyUpload = propertyParser.single("img")

// upload property floor plan
router.post('/property/upload/floor/:id', (req, res) => {
    Property.findById(req.params.id)
        .exec(function (err, property) {
            if (!property) {
                res.status(400).send('oops! property not found')
            }
            else {
                propertyUpload(req, res, function (err) {
                    if (err) {
                        res.json({ success: false, message: err.message })
                    }
                    else {
                        let image = {};
                        image.url = req.file.secure_url;
                        image.publicId = req.file.public_id;
                        property.floor_uploads.push(image)
                        property.save()
                        res.json({ success: true, message: "Property floor layout uploaded successfully" })
                    }
                })
            }
        })
});

// upload property 3d plan
router.post('/property/upload/d/:id', (req, res) => {
    Property.findById(req.params.id)
        .exec(function (err, property) {
            if (!property) {
                res.status(400).send('oops! property not found')
            }
            else {
                propertyUpload(req, res, function (err) {
                    if (err) {
                        res.json({ success: false, message: err.message })
                    }
                    else {
                        let image = {};
                        image.url = req.file.secure_url;
                        image.publicId = req.file.public_id;
                        property.d_uploads.push(image)
                        property.save()
                        res.json({ success: true, message: "Property 3D uploaded successfully" })
                    }
                })
            }
        })
});

// upload property site layout plan
router.post('/property/upload/layout/:id', (req, res) => {
    Property.findById(req.params.id)
        .exec(function (err, property) {
            if (!property) {
                res.status(400).send('oops! property not found')
            }
            else {
                propertyUpload(req, res, function (err) {
                    if (err) {
                        res.json({ success: false, message: err.message })
                    }
                    else {
                        let image = {};
                        image.url = req.file.secure_url;
                        image.publicId = req.file.public_id;
                        property.site_uploads.push(image)
                        property.save()
                        res.json({ success: true, message: "Property site layout uploaded successfully" })
                    }
                })
            }
        })
});


// fetch all appointment 
router.route('/appointments').get((req, res) => {
    Appointment.find( (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});

// fetch all sheduled appointments 
router.route('/appointments/scheduled').get((req, res) => {
    Appointment.find( { availability: false } , (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});



// fetch all successful appointment 
router.route('/appointments/successful').get((req, res) => {
    Appointment.find({  appointmentSuccessful: true }, (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});



// fetch all offers
router.route('/appointments/offer').get((req, res) => {
    Appointment.find({ offerIssued: true }, (err, appointments) => {
        if (err) {
            res.status(400).send("Failed to get appointment")
            console.log(err.message)
        }
        else
            res.json({ success: true, appointments: appointments });
    });
});




module.exports = router;