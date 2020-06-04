//jshint esversion:6

// AWS S3 upload/download functionality

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
const fs = require('fs');

// Upload a file to AWS S3
exports.uploadFile = function (file) {

  // Configure the file stream and obtain the upload parameters
  var fs = require('fs');
  var fileStream = fs.createReadStream(file);
  fileStream.on('error', function (err) {
    console.log('File Error', err);
  });

  var path = require('path');
  var fileName = path.basename(file);

  this.upload(fileStream, fileName);
};


// Upload data to AWS S3
exports.upload = function upload(data, fileName, callback) {

  // Set the region
  AWS.config.update({
    region: 'eu-central-1'
  });

  // Create S3 service object
  s3 = new AWS.S3({});

  // call S3 to retrieve upload file to specified bucket
  var uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: '',
    Body: ''
  };

  uploadParams.Body = data;
  var path = require('path');
  uploadParams.Key = fileName;

  // call S3 to retrieve upload file to specified bucket
  s3.upload(uploadParams, function (err, data) {
    callback(err, data);
  });
};


// Download a file from AWS S3
exports.download = function (fileKey, callback) {

  // Create S3 service object
  s3 = new AWS.S3({});

  var options = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileKey
  };

  s3.getObject(options, function (err, data) {
    callback(err, data.Body);
  });
};
