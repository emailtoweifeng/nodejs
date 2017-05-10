var models = require('../lib/models')
  , mongoose = models.mongoose
	, User = models.User
	, Driver = models.Driver
	, Passenger = models.Passenger
	, Taxi = models.Taxi
	, Fare = models.Fare
	, Location = models.Location
	, Message = models.Message
	, keys = 'User Driver Passenger Taxi Fare Location Message'.split(' ')
	, async = require('async')
	;

var steps = []; 
steps.push(function (next) {
	mongoose.connect('mongodb://localhost/taxi');
	mongoose.connection.on('connected', function(err) {
		if (!err) console.log('connected...');
		next(err);
	});
});

// TODO put the index code here autoIndex in mongoose doesn't seem to be working

keys.forEach(function(key) {
	steps.push(function(next) {
	  models[key].ensureIndexes();
		next();
	});
});

async.waterfall(steps, function(err) {
	if (err) console.error(err);
	mongoose.disconnect();
	mongoose.connection.on('disconnect', function() {
		process.exit(0);
	});
});
