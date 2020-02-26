const express = require("express");
const app = express();
let router = express.Router();
const FileType = require('file-type');
const JP = require("jimp");
let fs = require('fs');
const AWS = require("aws-sdk");
const maxFileSize = 10123680;
const maxBodySize = 5;
const endpoint = "endpoint";
const validExtentions = ["png", "bmp", "jpg"];


router.get('', (req, res) => { console.log("file name is empty"); res.end("filename is empty") });
router.get('/endpoint/:filename', requestHandle);

function requestHandle(req, res) {
    console.log(req.originalUrl);
    let fileName = req.originalUrl.substr(endpoint.length + 2);
    console.log(fileName);
    let contentType = req.headers["content-type"];
    res.setHeader('Content-Type', 'text/plain');
    let body = [];
    let bodySize = 0;
    let file = fs.createWriteStream(fileName);
    req.on('data', (chunk) => {
        body.push(chunk);
        if (body.length > maxBodySize) {
            body.forEach(function(v) { file.write(v); bodySize += v.byteLength; });
            if (bodySize > maxFileSize) { res.end("File size exceeded 1"); res.destroy(); fs.unlinkSync(fileName) }
            body.length = 0;
        }
    }).on('end', () => {
        file.on('error', function(err) { /* error handling */ });
        body.forEach(function(v) { file.write(v); bodySize += v.byteLength; });
        if (bodySize > maxFileSize) { res.end("File size exceeded 2"); res.destroy(); fs.unlinkSync(fileName) }
        file.end();
        handleFile(fileName, res);
        //res.end(bodySize.toFixed());
    });

}

app
    .use(router)
    .listen(3031);

console.log("Server is listening");

const handleFile = (fileName, res) => {
    (async () => {
        let fileType = await FileType.fromFile(fileName);
        if (fileType != undefined && fileType.mime != undefined && fileType.ext !=undefined) {
            if (validExtentions.indexOf(fileType.ext) == -1) { console.log("Invalid file extension"); res.end("Invalid file extension"); }
            if (fileType.mime.startsWith("image")) {
    console.log("this is a image");
                console.log(fileType.ext);
                const image = await JP.read(fileName);
                await image.quality(100);
                let imageHeight = image.getHeight();
                let imageWidth = image.getWidth();
                if (imageHeight >= 2048 && imageWidth >= 2048) {
                    await image.resize(2048, 2048);
                    await image.writeAsync("large_" + fileName);
                    await image.resize(1024, 1024);
                    await image.writeAsync("medium_" + fileName);
                } else if (imageHeight >= 1024 && imageWidth >= 1024) {
                    await image.resize(1024, 1024);
                    await image.writeAsync("medium_" + fileName);
                }
                await image.resize(300, 300);
                await image.writeAsync("small_" + fileName);
                fs.unlinkSync(fileName);
                res.end("file was transformed");
            }
        } else { console.log("this file is not image"); res.end("this file is not image"); }
        //=> {ext: 'png', mime: 'image/png'}
    })();
};

const uploadToAwsS3 = (fileName) => {
    // Set the region
    AWS.config.update({region: 'REGION'});

// Create S3 service object
    let s3 = new AWS.S3({apiVersion: '2006-03-01'});

    let myBucket = 'my.unique.bucket.name';
    let myKey = 'myBucketKey';

// call S3 to retrieve upload file to specified bucket
    let uploadParams = {Bucket: myBucket, Key: myKey, Body: ''};
    let file = fileName;

// Configure the file stream and obtain the upload parameters
    let fs = require('fs');
    let fileStream = fs.createReadStream(file);
    fileStream.on('error', function(err) {
        console.log('File Error', err);
    });
    uploadParams.Body = fileStream;
    let path = require('path');
    uploadParams.Key = path.basename(file);

// call S3 to retrieve upload file to specified bucket
    s3.upload (uploadParams, function (err, data) {
        if (err) {
            console.log("Error", err);
        } if (data) {
            console.log("Upload Success", data.Location);
        }
    });
};
