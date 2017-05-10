var mongoose = require('mongoose');

var Schema = new mongoose.Schema({
	user: { type:mongoose.Schema.Types.ObjectId, ref:'User', required: true },
	taxi: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Taxi', required: true }],
	license: { type:String, required: true, default:'unknown' },
	created: { type: Date, default: Date.now, required:true },
	creator: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
	updated: { type: Date, default: Date.now, required:true },
	updator: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
	status: { type:String, required: true, default:'active' },
	deleted: { type:Boolean, default:false },
	loc: [], //{type:[Number], index:'2d', default:'0'},
	ratingCount: { type:Number, default: 0, required: true },
	ratingSum: { type:Number, default: 0, required: true },
	verified: {  type:Date, default: null }
},{autoIndex: process.env.NODE_ENV == 'development'});

Schema.index({loc: "2d"});

var Driver = module.exports = mongoose.model('Driver', Schema);
