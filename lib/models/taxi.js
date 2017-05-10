var mongoose = require('mongoose');

var Schema = new mongoose.Schema({
	license: { type:String, required: true, default:'unknown' },
	condition: { type:String, required: true, default:'unknown' },
	make: { type:String, required: true, default:'unknown' },
	model: { type:String, required: true, default:'unknown' },
	year: { type:Number, required: true, default:Date.now },
	created: { type: Date, default: Date.now, required:true },
	creator: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
	updated: { type: Date, default: Date.now, required:true },
	updator: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },
	status: { type:String, required: true, default:'active' },
	deleted: { type:Boolean, default:false }
},{autoIndex: process.env.NODE_ENV == 'development'});

var Taxi = module.exports = mongoose.model('Taxi', Schema);
