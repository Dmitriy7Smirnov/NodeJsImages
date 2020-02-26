const express = require("express");
const app = express();
let router = express.Router();
const FileType = require('file-type');
const JP = require("jimp");
const maxFileSize = 1012368;
const maxBodySize = 5;

router.get('', (req, res) => { console.log("file name is empty"); res.end("filename is empty") });
router.get('/:filename', requestHandle);

function requestHandle(req, res, next) {
    console.log(req.originalUrl);
    let fileName = req.originalUrl.substr(1);
    console.log(fileName);
    let fs = require('fs');
    let contentType = req.headers["content-type"];

    res.setHeader('Content-Type', 'text/plain');
    let body = [];
    let bodySize = 0;
    console.log(bodySize);
    let file = fs.createWriteStream(fileName);
    req.on('data', (chunk) => {
        body.push(chunk);
        if (body.length > maxBodySize) {
            body.forEach(function(v) { file.write(v); bodySize += v.byteLength; });
            console.log(bodySize);
            if (bodySize > maxFileSize) { res.end("File size exceeded 1"); res.destroy(); fs.unlinkSync(fileName) };
            body.length = 0;
        }
    }).on('end', () => {

        file.on('error', function(err) { /* error handling */ });
        body.forEach(function(v) { file.write(v); bodySize += v.byteLength; });
        console.log("endOfFile");
        console.log(bodySize);
        console.log("");

        (async () => {
            let fileType = await FileType.fromFile(fileName);
            if (fileType != undefined && fileType.mime != undefined && fileType.ext !=undefined) {
                if (fileType.mime.startsWith("image")) {
                    console.log("this is a image");
                    console.log(fileType.ext);
                    const image = await JP.read(fileName);
                    await image.resize(300, 300);
                    await image.quality(90);
                    await image.writeAsync(fileName);
                }
            }  else {
                if (bodySize == 0) { console.log("you forgot to sent file") } else {
                    console.log("this is NOT image file"); }
            }
            //=> {ext: 'png', mime: 'image/png'}
        })();
        if (bodySize > maxFileSize) { res.end("File size exceeded 2"); res.destroy(); fs.unlinkSync(fileName)  };
        file.end();
        res.end(bodySize.toFixed());
    });

}

app
    .use(router)
    .listen(3031);

console.log("Server is listening");
