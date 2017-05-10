module.exports.mongoose = require('mongoose');

var User = module.exports.User = require('./user')
	, Passenger = module.exports.Passenger = require('./passenger')
  , Driver = module.exports.Driver = require('./driver')
  , Taxi = module.exports.Taxi = require('./taxi')
  , Fare = module.exports.Fare = require('./fare')
  , Location = module.exports.Location = require('./location')
	, Message = exports.Message = require('./message')
	;
