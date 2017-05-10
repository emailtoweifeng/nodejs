var mongoose = require('mongoose');

var Schema = new mongoose.Schema({
	type:{type:String, required:true, default:'unknown'},
	name:{type:String, required:true, default:'unnamed'},
	description:{type:String, required:false, default:'undescribed'},
	loc: [], //{type:[Number], index:'2d', default:0},
	radius:{type:Number,required:false,default:1},
	street:{type:String,required:false,default:'no street'},
	city:{type:String,required:false,default:'no city'},
	province:{type:String,required:false,default:'no province'},
	postal:{type:String,required:false,default:'no postal'},
	created: { type: Date, default: Date.now, required:true },
	creator: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },
	updated: { type: Date, default: Date.now, required:true },
	updator: { type:mongoose.Schema.Types.ObjectId, ref:'User', required:true },	
	status: { type:String, default: 'active', required:true },
	deleted: { type:Boolean, default:false }
}, {autoIndex: process.env.NODE_ENV == 'development'});

Schema.index({loc: "2d"});

var Location = module.exports = mongoose.model('Location', Schema);
