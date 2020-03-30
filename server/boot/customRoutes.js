module.exports = function(app) {
  var router = app.loopback.Router();
  var Stores = app.models.Stores;
  router.get('/api/stores/location', function(req, res) {
  	var location = req.query.location;
  	Stores.find({
  		where: {and: [{isOperating: true}, {or:[
  				{locality: {regex: new RegExp(`.*${location}.*`, 'i')}},
  				{city: {regex: new RegExp(`.*${location}.*`, 'i')}},
          {address: {regex: new RegExp(`.*${location}.*`, 'i')}}
  			]}]}
  	},
  		function(err, stores) {
	  		if (err) {
	  			res.status(400).json(err);
	  		} else {
	  		    res.status(200).json(stores);
	  		}
	  	});
  	});
  app.use(router);
};
