var loopback = require("loopback");
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
      console.log(hours);
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
          include: [
            {
              relation: "stores_slots",
              scope: {
                where: {
                  and: [
                    {
                      start_hours: {
                        gt: hours
                      }
                    },
                    {
                      maximun_people_allowed: {
                        gt: 0
                      }
                    }
                  ]
                },
                include: [
                  {
                    relation: "bookings"
                  }
                ]
              }
            }
          ]
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
    const { storeId, slotId, date } = req.query;
    if (!storeId || !slotId || !date) {
      return res
        .status(400)
        .json({ message: "Sufficient params not provided" });
    }
    var Bookings = app.models.Bookings;
    var startOfToday = new Date();
    startOfToday.setHours(0);
    startOfToday.setMinutes(0);
    startOfToday.setSeconds(0);
    startOfToday.setMilliseconds(0);
    startOfToday = startOfToday.toISOString();
    Bookings.find(
      {
        where: {
          booking_date: {
            gt: startOfToday
          },
          and: [{ slot_id: slotId }, { store_id: storeId }]
        },
        include: "stores_slots"
      },
      function (err, bookings = []) {
        if (err) {
          console.log(err);
          res.status(500).json(err);
        } else {
          const booking = bookings[0];
          const maxPeopleInSlot =
            booking &&
            booking.stores_slots &&
            booking.stores_slots() &&
            booking.stores_slots().maximun_people_allowed;
          if (bookings.length >= maxPeopleInSlot) {
            return res
              .status(400)
              .json({ message: "This slot is full please use another slot!" });
          } else {
            return res.status(200).json({ message: "Success" });
          }
        }
      }
    );
  });

  app.use(router);
};
