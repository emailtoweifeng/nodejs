var models = require('../lib/models')
  , mongoose = models.mongoose
	, User = models.User
	, Driver = models.Driver
	, Passenger = models.Passenger
	, Taxi = models.Taxi
	, Fare = models.Fare
	, Location = models.Location
	, Subscription = models.Subscription
	, SubscriptionOption = models.SubscriptionOption
	, Event = models.Event 
	, keys = 'User Driver Passenger Taxi Fare Location Subscription SubscriptionOption Event'.split(' ')
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

keys.forEach(function(key) {
	steps.push(function(next) {
	models[key].remove({}, function (err) { console.log(key + ' have been removed...'); next(err)});
	});
});

steps.push(function (next) {
	
	var user = new User()
		, taxi = new Taxi()
		, driver = new Driver()
	
	user.creator = user.updator = taxi.creator = taxi.updator = driver.creator = driver.updator = user;

	driver.user = user;
	driver.taxi = taxi;

	user.save(function (err, doc) {
		if (err) return next(err);
		console.log('user', doc);
		taxi.save(function (err, doc) {
			if (err) return next(err);
			console.log('taxi', doc);
			driver.save(function (err, doc) {
				if (err) return next(err);
				console.log('driver', doc);
				next();
			});
		});
	});

});

async.waterfall(steps, function(err) {
	if (err) console.error(err);
	mongoose.disconnect();
	mongoose.connection.on('disconnect', function() {
		process.exit(0);
	});
});
