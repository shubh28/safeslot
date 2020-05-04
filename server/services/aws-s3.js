const fs = require('fs');
const AWS = require('aws-sdk');
const Sharp = require('sharp');

class AWS_S3 {
  constructor() {
    console.log("constructor called");
    this.config = {
      apiVersion: "2006-03-01",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    };

    this.s3 = new AWS.S3(this.config);
  }

  /**
   * This function will upload the file to AWS S3 in the provided Bucket
   * @param {Buffer} buffer 
   * @param {String} name 
   * @return
   */
  upload(buffer, name) {
    return new Promise((resolve, reject) => {
      let params = {
        Body: buffer,
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: name
      };

      this.s3.putObject(params, (error, data) => {
        if (error)
          reject(error);

        resolve(data);
      });
    });
  }

  /**
   * This function will generate a thumbnail of the provided image
   * @param {String} filePath 
   */
  generateThumbnail(filePath) {
    let height = 200;
    let width = 200;

    return Sharp(filePath)
      .resize(width, height)
      .toBuffer();
  }

  /**
   * This function will be used by the API to generate a thumbnail and upload both the original and thumbnail to AWS S3
   * @param {String} filePath 
   * @param {String} name 
   */
  generateThumbnailAndUpload(filePath, name) {
    let originalFileBuffer = fs.readFileSync(filePath);
    return this.generateThumbnail(filePath)
      .then(resizedFileBuffer => {
        let resizedFilename = "thumbnail-" + name;
        let promiseArr = [
          this.upload(originalFileBuffer, name),
          this.upload(resizedFileBuffer, resizedFilename)
        ];

        return Promise.all(promiseArr);
      })
      .catch(error => {
        console.error(error);
        return Promise.reject("Some error occurred");
      });
  }
}

module.exports = new AWS_S3();