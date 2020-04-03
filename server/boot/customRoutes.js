var loopback = require("loopback");
module.exports = function(app) {
  var router = app.loopback.Router();
  var Stores = app.models.Stores;
  router.get("/api/stores/location", function(req, res) {
    var location = req.query.location;
    var lat = req.query.lat;
    var lng = req.query.lng;

    if (lat && lng) {
      var userLocation = new loopback.GeoPoint({ lng: lng, lat: lat });
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
          include: {
            stores_slots_count: "slots"
          }
        },
        function(err, stores) {
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
    } else {
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
        function(err, stores) {
          if (err) {
            res.status(400).json(err);
          } else {
            res.status(200).json(stores);
          }
        }
      );
    }
  });
  app.use(router);
};
