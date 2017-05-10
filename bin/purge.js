var models = require('../lib/models')
  , mongoose = models.mongoose
	, User = models.User
	, Driver = models.Driver
	, Passenger = models.Passenger
	, Taxi = models.Taxi
	, Fare = models.Fare
	, Message = models.Message
	, Location = models.Location
	, keys = 'User Driver Passenger Taxi Fare Location Message'.split(' ')
	, async = require('async')
	;

var mode = process.env.NODE_ENV || 'development';

var steps = []; 
steps.push(function (next) {
	//TODO update this with a conf
	if (mode == 'development') {
		mongoose.connect('mongodb://localhost/taxi_dev');
	} 
	else {
		mongoose.connect('mongodb://localhost/taxi');
	}
	mongoose.connection.on('connected', function(err) {
		if (!err) console.log('connected...');
		next(err);
	});
});

keys.forEach(function(key) {
	steps.push(function(next) {
	models[key].remove({}, function (err) { console.log(key + ' have been removed...'); next(err)});
	});
});

async.waterfall(steps, function(err) {
	if (err) console.error(err);
	mongoose.disconnect();
	mongoose.connection.on('disconnect', function() {
		process.exit(0);
	});
});
