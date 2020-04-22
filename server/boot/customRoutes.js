const loopback = require("loopback");
module.exports = function (app) {
  const router = app.loopback.Router();
  const Stores = app.models.Stores;
  const Bookings = app.models.Bookings;
  const Stores_slots = app.models.Stores_slots;
  const bodyParser = require("body-parser");
  app.use(bodyParser.json({ extended: true }));

  router.post("/api/bookings", (req, res) => {
    //front-end req needs to pass in store_id, slot_id, user_id
    //also takes order_details for users with email-linked accounts
    const newBooking = req.body;
    const store = Stores.findById(store_id);
    const bookings = Bookings.find({ "where": { "slot_id": slot_id } }); ///and store_id = store_id
    const slot = Stores_slots.findById(slot_id);

    Promise.all([store, bookings, slot])
      .then(queries => {
        const storeResult = queries[0];
        const bookingsResult = queries[1];
        const slotResult = queries[2];
        const maxPeopleAllowed = slotResult.maximun_people_allowed;

        if (!storeResult.isVerified || (bookingsResult.length < maxPeopleAllowed && storeResult.isVerified)) {
          Bookings.create(newBooking)
            .then(createdBooking => res.json(createdBooking))
            .catch(err => console.log(err));
        } else {
          res.json({ "error": "This time slot is no longer available. Try a different slot." })
        }
      })
      .catch(err => console.log(err));
  })

  router.get("/api/stores/location", function (req, res) {
    const location = req.query.location;
    const lat = req.query.lat;
    const lng = req.query.lng;

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
      const userLocation = new loopback.GeoPoint({ lng: lng, lat: lat });
      console.log(new Date().getHours())
      let hours = new Date().getUTCHours() + 5;
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

  // router.get("/api/booking-slot/status", function (req, res) {
  //   const storeId = req.query.storeId;
  //   const slotId = req.query.slotId;
  //   if (!storeId || !slotId) {
  //     return res.status(400).json({ message: 'Sufficient params not provided' })
  //   }
  //   var Bookings = app.models.Bookings;
  //   Bookings.find(
  //     {
  //       where: {
  //         and: [
  //           { slot_id: slotId },
  //           { store_id: storeId }
  //         ]
  //       },
  //       include: "stores_slots"
  //     },
  //     function (err, bookings = []) {
  //       if (err) {
  //         console.log(err);
  //         res.status(500).json(err);
  //       } else {
  //         const booking = bookings[0];
  //         const maxPeopleInSlot = booking && booking.stores_slots && booking.stores_slots() && booking.stores_slots().maximun_people_allowed;
  //         if (bookings.length >= maxPeopleInSlot) {
  //           return res.status(400).json({ message: "This slot is full please use another slot!" });
  //         } else {
  //           return res.status(200).json({ message: "Success" });
  //         }
  //       }
  //     }
  //   )
  // })


  app.use(router);
};


