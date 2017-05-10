var mongoose = require('mongoose')
  , Driver = require('./driver');

var Schema = new mongoose.Schema({
	loc: [], //{type:[Number], index:'2d' },//this is the locatin the fare was created
	passengers: [{ type:mongoose.Schema.Types.ObjectId, ref:'Passenger' }],
	driver: { type:mongoose.Schema.Types.ObjectId, ref:'Driver' },
	approved: { type:Boolean, default: false },
	taxi: { type:mongoose.Schema.Types.ObjectId, ref:'Taxi' },
	//NOT EXACTLY USED RIGHT NOW!!!!
	route: [{ type:mongoose.Schema.Types.ObjectId, ref:'Location' }],
	created: { type: Date, default: Date.now },
	creator: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
	updated: { type: Date, default: Date.now },
	updator: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },	
	status: { type:String, default: 'active', required:true },
	deleted: { type:Boolean, default:false },
	withinProximity: {type:Boolean, default:false },
	pickupConfirmed: { type:Number, default:-1, required:true },
	dropoffConfirmed: { type:Number, default:-1, required:true },
	expired: { type: Date },
},{autoIndex: process.env.NODE_ENV == 'development'});

Schema.index({loc: "2d"});

/*
 eg.

 req.fare.findNearbyDrivers(function (err, drivers) {
		console.log(drivers.length);
 });

 */

Schema.methods.findNearbyDrivers = function (cb) {
		
	var query = {
			'loc': {
			$within: {
				$centerSphere: [
					// @manoj long and lat defaults are 0
					[ this.loc[0] || 0, this.loc[1] || 0 ],
					// @manoj hard coded 5 miles here
					(20 / 3963.192)
				]
			}
		},
		status:'active',
		deleted:false
	};

	return this.model('Driver').find(query).exec(cb);

};

Schema.methods.getWithinProximityOf = function (thing, cb) {
	var self = this;
	var query = {
			_id: self.id,
			'loc': {
			$within: {
				$centerSphere: [
					[ thing.loc[0] || 0, thing.loc[1] || 0 ],
					// within 1/10 of a mile
					.1 / 3963.192
				]
			}
		}
	};
	return this.model('Fare').findOne(query).exec(function (err, doc) {
		if (err) return cb(err);
		self.withinProximity = doc ? true : false;
		cb(null, self.withinProximity);
	});
};

var Fare = module.exports = mongoose.model('Fare', Schema);
