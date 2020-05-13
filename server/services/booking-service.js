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
  if (files) {
    files.prescriptions.forEach(file => {
      promiseArr.push(
        AWS_S3.generateThumbnailAndUpload(file.data, file.name, fields.user_id)
          .then(data => formatUploadedObject(data))
      );
    });
  }

  let booking;
  return Bookings.create(formattedBooking)
    .then(savedBooking => {
      booking = savedBooking;
      return Promise.all(promiseArr);
    })
    .then(uploadedFiles => {
      let formattedPrescriptions = {};
      uploadedFiles.forEach(e => {
        formattedPrescriptions[Object.keys(e)[0]] = e[Object.keys(e)[0]];
      });

      booking.booking_data = { prescriptions: formattedPrescriptions };
      return booking.save();
    })
    .catch(err => {
      console.error(err);
      return Promise.reject();
    })
};

module.exports.updateSlot = (app, fields, files, slotId) => {
  let Bookings = app.models.Bookings;
  console.log(fields);
  console.log(files);
  let promiseArr = [];

  let booking;
  return Bookings.findById(slotId)
    .then(savedBooking => {
      booking = savedBooking;
      if (!booking)
        return Promise.reject(`no booking found for slot ${slotId}`);

      if (files) {
        files.prescriptions.forEach(file => {
          promiseArr.push(
            AWS_S3.generateThumbnailAndUpload(file.data, file.name, fields.user_id)
              .then(data => formatUploadedObject(data))
          );
        });
      }

      return Promise.all(promiseArr);
    })
    .then(uploadedFiles => {
      let formattedPrescriptions = {};
      uploadedFiles.forEach(e => {
        formattedPrescriptions[Object.keys(e)[0]] = e[Object.keys(e)[0]];
      });

      if (fields) {
        if (fields.store_id)
          booking.store_id = fields.store_id;

        if (fields.slot_id)
          booking.slot_id = fields.slot_id;

        if (fields.user_id)
          booking.user_id = fields.user_id;

        if (fields.status)
          booking.status = fields.status;

        if (fields.booking_date)
          booking.booking_date = fields.booking_date;

        if (fields.order_details)
          booking.order_details = fields.order_details[0];
      }

      if (Object.keys(formattedPrescriptions).length !== 0)
        booking.booking_data = { prescriptions: formattedPrescriptions };

      return booking.save();
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