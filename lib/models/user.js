var mongoose = require('mongoose')
  , bcrypt = require('bcrypt')

var Schema = new mongoose.Schema({
	imgSource: { type:String, required: false, default:null },
	email: { type:String, required: false, default:'unknown' },
	phone: { type:String, required: true },
	password: { type:String, required: true, default:'unknown' },
  pin: {type:String, required: true, default:"0000" },
	code: { type:String, required: false, default: null },
	name: {
		first: { type: String, required: false, default:'unknown' },
		last: { type: String, required: false, default:'unknown' }
	},
	loc: [],//{type:[Number], index:'2d' },
	registerd: { type: Boolean, required: true, default:false },
	events: [ {type:mongoose.Schema.Types.ObjectId, ref:'Event'} ],
	created: { type: Date, default: Date.now, required:true },
	/*creator: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },*/
	updated: { type: Date, default: Date.now, required:true },
	/*updator: { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true },*/
	status: { type:String, required: true, default:'active' },
	deleted: { type:Boolean, default:false },
	admin: { type:Boolean, default:false },
	confirmed: { type:Date, default: null }
},{autoIndex: process.env.NODE_ENV == 'development'});

Schema.index({loc: "2d"});

Schema.set('toJSON', { hide: 'password' });

Schema.pre('save', function (next) {

	var user = this;

	if (!this.isModified('password')) return next();	

	bcrypt.genSalt(10, function (err, salt) {
		if (err) return next(err);
		bcrypt.hash(user.password, salt, function (err, hash) {
			if (err) return next(err);
			user.password = hash;
			next();
		});
	});

});

Schema.methods.comparePassword = function (password, cb) {
	bcrypt.compare(password, this.password, function (err, matched) {
		if (err) return cb(err);
		cb(null, matched);
	});
};

var User = module.exports = mongoose.model('User', Schema);
