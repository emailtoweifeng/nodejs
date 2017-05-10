var mongoose = require('mongoose');

var Schema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	fare: { type: mongoose.Schema.Types.ObjectId, ref: 'Fare', required: true },
	driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
	taxi: { type: mongoose.Schema.Types.ObjectId, ref: 'Taxi', required: true },
	pickup: { type:Date, default:new Date() },
	dropoff: { type:Date, default:null },
	created: { type: Date, default: Date.now, required:true },
	creator: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
	updated: { type: Date, default: Date.now, required:true },
	updator: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
	status: { type:String, required: true, default:'active' },
	deleted: { type:Boolean, default:false },
	pickup_loc: { type:mongoose.Schema.Types.ObjectId, ref:'Location' },
	dropoff_loc: { type:mongoose.Schema.Types.ObjectId, ref:'Location' },
	loc: [], //{type:[Number], index:'2d', default:0},
},{autoIndex: process.env.NODE_ENV == 'development'});

Schema.index({loc: "2d"});

var Passenger = module.exports = mongoose.model('Passenger', Schema);
