var loopback = require("loopback");
let multiparty = require('multiparty');
let AWS_S3 = require('../services/aws-s3');

module.exports = function (app) {
  var router = app.loopback.Router();
  var Stores = app.models.Stores;
  router.get("/api/stores/location", function (req, res) {
    var location = req.query.location;
    var lat = req.query.lat;
    var lng = req.query.lng;
    var hours = req.query.time || 0;

    if (!lat || !lng) {
      Stores.find(
        {
          where: {
            and: [
              { isOperating: true },
              {
                or: [
                  { locality: { regex: new RegExp(`.*${location}.*`, "i") } },
                  { city: { regex: new RegExp(`.*${location}.*`, "i") } },
                  { address: { regex: new RegExp(`.*${location}.*`, "i") } }
                ]
              }
            ]
          }
        },
        function (err, stores) {
          if (err) {
            res.status(400).json(err);
          } else {
            res.status(200).json(stores);
          }
        }
      );
    } else {
      var userLocation = new loopback.GeoPoint({ lng: lng, lat: lat });
      console.log(hours)
      if (hours >= 24) {
        hours -= 24;
      }
      Stores.find(
        {
          where: {
            and: [
              { isOperating: true },
              {
                location: {
                  near: userLocation,
                  maxDistance: 10,
                  unit: "kilometers"
                }
              }
            ]
          },
          include: [{
            relation: "stores_slots",
            scope: {
              where: {
                start_hours: {
                  gt: hours
                }
              }
            }
          }]
        },
        function (err, stores) {
          if (err) {
            res.status(400).json(err);
          } else {
            const updatedStores = stores.map(store => {
              return {
                ...store,
                ...{
                  distance: userLocation.distanceTo(
                    loopback.GeoPoint(store.location),
                    "kilometers"
                  )
                }
              };
            });

            res.status(200).json(updatedStores);
          }
        }
      );
    }
  });

  router.get("/api/booking-slot/status", function (req, res) {
    const storeId = req.query.storeId;
    const slotId = req.query.slotId;
    if (!storeId || !slotId) {
      return res.status(400).json({ message: 'Sufficient params not provided' })
    }
    var Bookings = app.models.Bookings;
    Bookings.find(
      {
        where: {
          and: [
            { slot_id: slotId },
            { store_id: storeId }
          ]
        },
        include: "stores_slots"
      },
      function (err, bookings = []) {
        if (err) {
          console.log(err);
          res.status(500).json(err);
        } else {
          const booking = bookings[0];
          const maxPeopleInSlot = booking && booking.stores_slots && booking.stores_slots() && booking.stores_slots().maximun_people_allowed;
          if (bookings.length >= maxPeopleInSlot) {
            return res.status(400).json({ message: "This slot is full please use another slot!" });
          } else {
            return res.status(200).json({ message: "Success" });
          }
        }
      }
    )
  })


  router.post("/api/booking-slot/", (req, res) => {
    let form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
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
          AWS_S3.generateThumbnailAndUpload(file.path, file.originalFilename)
        );
      });

      Promise.all(promiseArr)
        .then(result => {
          console.log(JSON.parse(JSON.stringify(result)));
          res.send();
        })
        .catch(err => {
          res.status(500).json({ message: err });
        });
    });
  })


  app.use(router);
};
