const fs = require('fs');
const AWS = require('aws-sdk');
const Sharp = require('sharp');
const moment = require('moment');

class AWS_S3 {
  constructor() {
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
        Key: name,
        ACL: "public-read"
      };

      this.s3.upload(params, (error, data) => {
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
   * @param {Buffer} originalFileBuffer 
   * @param {String} name 
   * @param {String} user_id
   */
  generateThumbnailAndUpload(originalFileBuffer, name, user_id) {
    name = user_id + '_' + moment().format('YYYY_MM_DD_hh_mm_SS') + '_' + name;
    return this.generateThumbnail(originalFileBuffer)
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