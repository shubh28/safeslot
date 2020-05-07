let AWS_S3 = require('./aws-s3');


module.exports.bookSlot = (app, fields, files) => {
  let Bookings = app.models.Bookings;
  let formattedBooking = {
    store_id: fields.store_id,
    slot_id: fields.slot_id,
    user_id: fields.user_id,
    status: fields.status,
    booking_date: fields.booking_date,
    order_details: fields.order_details
  };

  let promiseArr = [];
  files.prescriptions.forEach(file => {
    promiseArr.push(
      AWS_S3.generateThumbnailAndUpload(file.path, file.originalFilename, fields.user_id)
        .then(data => formatUploadedObject(data))
    );
  });

  let booking;
  return Bookings.create(formattedBooking)
    .then(savedBooking => {
      booking = savedBooking;
      return Promise.all(promiseArr);
    })
    .then(uploadedFiles => {
      // let formattedPrescriptions = { prescriptions:  }
      console.log(JSON.stringify(uploadedFiles));
      return Promise.resolve();
    })
    .catch(err => {
      console.error(err);
      return Promise.reject();
    })
};

let formatUploadedObject = (data) => {
  return {
    [data[0].key]: {
      original: data[0],
      thumbnail: data[1]
    }
  };
}