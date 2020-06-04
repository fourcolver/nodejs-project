//jshint esversion:6

const express = require('express');
const router = express.Router();
const UserController = require('../controller/UserController');
const MainController = require('../controller/MainController');
const BasicController = require('../controller/BasicController');
const ApiController = require('../controller/ApiController');
const passport = require('passport');
const multer = require('multer');
const multerS3= require('multer-s3');
const aws = require('aws-sdk');
const UserControl = new UserController();
const MainControl = new MainController();
const BasicControl = new BasicController();
const ApiControl = new ApiController();

// Set the region
aws.config.update({
  region: 'eu-central-1'
});

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    // acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, `${req.body.eventId}-${file.originalname}`);
    }
  })
});

// user management
router.get('/', UserControl.home);
router.get('/login', UserControl.loginPage);
router.post('/login', passport.authenticate('local-login', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));
router.get('/register', UserControl.registerPage);
router.get('/registerwithband', UserControl.registerPageBand);
router.post('/register', passport.authenticate('local-signup', {
    successRedirect: '/login',
    failureRedirect: 'back',
    failureFlash: true
}));
router.get('/userchange/:userId', UserControl.userPage);
router.post('/userchange', UserControl.userChange);
router.get('/forgot', UserControl.forgotPage);
router.post('/forgot', UserControl.forgotPassword);
router.get('/reset', UserControl.resetPage);
router.post('/reset', UserControl.resetPassword);
router.get('/logout', UserControl.logoutUser);

// band management
router.post('/addband', MainControl.addBand);
router.get('/newband', MainControl.addbandPage);
router.get('/bandsetpage', MainControl.bandPage);
router.post('/bandchange', MainControl.bandChange);
router.post('/invitemember', MainControl.inviteMember);
router.post('/bandselect', MainControl.bandSelect); // band select in list page
router.post('/bandselectwithmember', MainControl.bandmemberSelect); // band select in bandmember setting page
router.post('/deleteMember', MainControl.deleteMember);
router.post('/invoiceChange', MainControl.invoiceChange);
router.post('/contractChange', MainControl.contractChange);

// event management
// create event
router.post('/events', MainControl.addEvent);
router.post('/save', MainControl.saveEvent);
router.post('/close', MainControl.cancelEvent);
router.post('/uploadFiles', upload.array('uploadfiles', 12), MainControl.uploadFiles);
router.post('/deleteFiles', MainControl.deleteFile);
router.get('/getFiles/:key', MainControl.getFiles);
router.post('/cancelUpload', MainControl.cancelFiles);


// edit event
router.get('/details/:eventId', MainControl.editEvent);
router.post('/details/save', MainControl.saveEvent);
router.post('/details/close', MainControl.cancelEvent);
router.get('/copy/:eventId', MainControl.copyEvent);
router.post('/copy/save', MainControl.saveEvent);
router.post('/delete', MainControl.deleteEvent);

//change history
router.get('/changeHistory', MainControl.changeHistory);


// export functions
router.post('/ics', MainControl.createIcs);
router.post('/contract', BasicControl.createContract);
router.post('/invoice', BasicControl.createInvoice);
router.post('/invoicePreview', BasicControl.createInvoicePreview)
router.get('/file', BasicControl.fileDownload);

//api configuration
router.get('/api/events', ApiControl.getEvents);
router.post('/api/events', ApiControl.addEvent);
module.exports = router;
