var debug = require('debug')('taxi:app');
/*
 * Custom object properties and methods
 */

require('./lib/object');
require('./lib/number');


/**
 * Module dependencies.
 */

var express = require('express')
  , cookieParser = require('cookie-parser')
  , expressSession = require('express-session')
	, connect = require('connect')
	, engine = require('ejs-locals')
	, async = require('async') 
  , path = require('path') 
	, cookie = require('cookie')
	, everyauth = require('./lib/auth')
	, models = require('./lib/models')
	, utility = require('./lib/utility')
  , routes = require('./routes') 
	;

/*
var twilio = require('twilio')
	, client = new twilio.RestClient('ACb381f53c9bfddea9411e111ce49af19a', '2352d78bf0367efa68a1f744b467663e')
	, tn = '+16144501526';
	*/

//the express application
var app = express();

//when there is an error with mongoose we want to kill and respawn (for now)
models.mongoose.connection.on('err', function (err) { throw err; });

app.configure(function(){
	app.engine('ejs', engine); // use ejs-locals for all ejs templates
  app.set('port', process.env.PORT || 3000); //the port our app will run on
  app.set('views', __dirname + '/views'); //the directory where our views and templates go
  app.set('view engine', 'ejs'); //the view engine (which is ejs)
  app.set('layout', 'layout'); //the layout file
  app.use(express.favicon()); //the fav icon
  app.use(express.logger('dev')); //devfault logger for stuff @TODO write this to /var/log/mysafedrop/taxi/startup.log and /var/log/mysafedrop/taxi/access.log
	app.use(express.compress());
  app.use(express.static(path.join(__dirname, 'public'),{maxAge:24*60*60})); //if we can't satisfy requests with the router attempt to default with public assets
  app.use(cookieParser()); //handles parsing cookie data
  app.use(expressSession(require('./lib/session').config)); //handles session management given cookies and shit
  app.use(express.bodyParser()); //parses the request body
  app.use(express.methodOverride()); //handles overriden HTTP methods
	app.use(everyauth.middleware()); //the module handles our reg / login authorization and authentication
  app.use(app.router); //use the application router (which are defined below as get/post/put/del routes)
});

//production configuration
app.configure('production', function() {
	console.log = function () { }; //override console.log with empty NOOP function
	models.mongoose.connect('mongodb://localhost/taxi'); //connect to prod db
});

app.configure('development', function() {
	models.mongoose.connect('mongodb://localhost/taxi_dev'); //connect to dev db
  app.use(express.errorHandler()); //debug error handler
});

app.configure('beta', function() {
	models.mongoose.connect('mongodb://localhost/taxi_beta'); //connect to beta db
  app.use(express.errorHandler()); //debug error handler
});

app.configure('testing', function() {
	models.mongoose.connect('mongodb://localhost/taxi_testing'); //connect to testing db
  app.use(express.errorHandler()); //debug error handler
});

/*
 * Utility
 */

var getUsersObjects = utility.buildGetUsersObjects('user')
	, getDriversObjects = utility.buildGetDriversObjects('user_objects')
	, getUserInfo = function (id, cb) {
			var data = {};
			models.User.findById(id, function (err, user) {
				if (err) return cb(err);
				data.user = user;	
				getUsersObjects(data, {}, function (err) {
					if (err) return cb(err);
					if (data.user_objects.driver) {
						getDriversObjects(data, {}, function (err) {
							if (err) return cb(err);
							cb(null, data);
						});
					}
					else {
						cb(null, data);
					}
				});
			});
		}
	;

app.get('/reset', routes.reset.view);
app.post('/reset', routes.reset.generate);

app.get('/code', routes.code.view);
app.post('/code', routes.code.validate);

app.all('*', getUsersObjects, getDriversObjects);

app.param('fare', utility.buildParamHandler('Fare',null,['driver', 'creator', 'passengers', 'taxi']));
app.param('user', utility.buildParamHandler('User','target'),  utility.buildGetUsersObjects('target'), utility.buildGetDriversObjects('target_objects'));

app.get('/confirmation/code', routes.confirmation.generate);
app.get('/confirmation', routes.confirmation.view);
app.post('/confirmation', routes.confirmation.validate);

app.post('/user/location', routes.user.position);

app.get('*', routes.confirmation.check);

app.get('/', routes.index);

app.get('/r', routes.redirect);

app.get('/*/(search|queue)', utility.buildStandardSearchFilters());

app.get('/driver/register', routes.driver.register);
app.post('/driver/register', routes.driver.register);

app.get('/fare', routes.fare.create);
app.post('/fare', routes.fare.create);
app.get('/fare/queue', routes.fare.queue);
app.get('/fare/:fare', routes.fare.view);
app.get('/fare/:fare/accept', routes.fare.accept);
app.post('/fare/:fare/accept', routes.fare.accept);
app.get('/fare/:fare/cancel', routes.fare.cancel);
app.post('/fare/:fare/cancel', routes.fare.cancel);
app.get('/fare/:fare/pickup', routes.fare.pickup);
app.post('/fare/:fare/pickup', routes.fare.pickup);
app.get('/fare/:fare/dropoff', routes.fare.dropoff);
app.post('/fare/:fare/dropoff', routes.fare.dropoff);
app.post('/fare/:fare/confirm/pickup', routes.fare.confirmPickup);
app.post('/fare/:fare/confirm/dropoff', routes.fare.confirmDropoff);
app.post('/fare/:fare/request/:approved', routes.fare.approve);
app.post('/fare/:fare/request', routes.fare.approve);
app.get('/fare/:fare/rate', routes.fare.rate);
app.post('/fare/:fare/rate', routes.fare.rate);

app.get('/user', utility.buildModelRedirectHandler('user'));
app.get('/user/:user', routes.user.view);

app.get('/image/upload', routes.image.upload);
app.post('/image/upload', routes.image.upload);
app.get('/image/:image', routes.image.view);

module.exports = app;

setInterval(function () {

	models.Fare.update({
		status:'active',
		driver:{$exists: false},
		deleted:false,
		updated: {$lt: new Date (new Date().getTime() - (60*60*1000)) }
	}, { 
		$set: { deleted: true, expired: new Date(), updated: new Date(), status:'canceled' } 
	}, function (err, res) {
		if (err) return console.error(err);
	});

}, 5000);

if ('development' === app.get('env')) {
  setInterval(function () {
    debug("memory heap total %j", process.memoryUsage());
    if (global.gc) {
      global.gc();
    }
  }, 1000);
}
