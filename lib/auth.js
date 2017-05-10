/**
 * Every Auth Configuration
 */
var everyauth = module.exports = require('everyauth')
  , User = require('./models').User
	, Driver = require('./models').Driver

everyauth.everymodule.userPkey('_id');

everyauth.everymodule.findUserById( function (req, id, callback) {
	User.findById( id, callback );
});

everyauth.everymodule.logoutPath('/logout');

everyauth.everymodule.logoutRedirectPath('/');

everyauth.password
	.getLoginPath('/login')
	.postLoginPath('/login')
	.loginView('login.ejs')
	.authenticate( function (login, password) {
		if (!login || !login.length) return ['Please enter a username!'];
		if (!password || !password.length) return ['Please enter a password!'];
		var promise = this.Promise();
		User.findOne({phone:login}, function (err, doc) {
			if (err) return promise.fail(err);
			if (!doc) return promise.fulfill([new Error('User not found!')]);
			doc.comparePassword(password, function (err, matched) {
				if (err) return promise.fail(err);
				if (!matched) return promise.fulfill([new Error('Incorrect password!')]);
				promise.fulfill(doc);
			});
		});
		return promise;
	})
	.loginSuccessRedirect('/r') // this should login to a redirect handler that will look at the RLD and go from there
	.getRegisterPath('/register')
	.postRegisterPath('/register')
	.registerView('register.ejs')
	.extractExtraRegistrationParams( function (req) {
		return req.body;
	})
	.validateRegistration( function (newUserAttributes) {
		var promise = this.Promise();
		var attr = {};
		if (newUserAttributes.phone) attr.phone = newUserAttributes.phone;
	  if (!newUserAttributes.pin || newUserAttributes.pin.length !== 4 ) return ['Pin must be 4 digits'];
		User.findOne(attr, function (err, doc) {
			if (err) return promise.fail(err);
			if (doc) return promise.fulfill([new Error('User already registered with this phone number')]);
			promise.fulfill(true);
		});
		return promise;
	})
	.registerUser( function (newUserAttributes) {
		var promise = this.Promise();
		var attr = {};
       
        // Validate the phone number is present
        if(!newUserAttributes['phone']) return promise.fulfill([new Error('Phone number is required')]); 

        // Query the user by the phone number.
        attr['phone'] = newUserAttributes['phone'];
		User.findOne(attr, function (err, doc) {
			if (err) return promise.fail(err);
			if (doc) return promise.fulfill([new Error('User already registered with this phone number')]);
			new User(newUserAttributes).save(function(err, doc) {
				if (err) return promise.fail(err);
				promise.fulfill(doc);
			});
		});
		return promise;
	})
	.registerSuccessRedirect('/r')
	.loginFormFieldName('phone')
	.passwordFormFieldName('password')
	.loginWith('phone')
	.loginLocals( function (req, res) {
		return {
			req: req
		}
	})
	.registerLocals( function (req, res) {
		return {
			req: req
		}
	})
	.respondToLoginSucceed( function (res, user, data) {
		if (!user) return;// res.render('login', {req:data.req, errors:data.errors});
		var self = this;
		Driver.findOne({user:user.id, status:'active'}, function (err, driver) {
			if (err) console.err(err);
			if (driver) {
				self.redirect(res, getD(data.req, '/fare/queue'));
			}
			else
				self.redirect(res, getD(data.req, '/'));
		});
	})
	.respondToRegistrationSucceed( function (res, user, data) {
		this.redirect(res, getD(data.req, '/user/'+user.id));
	})
	;

if (process.env.NODE_ENV=='debug') {
	console.log('everyauth.password.configurable()',everyauth.password.configurable());
}

/*
 * This method will get the destination from the request or default to e or '/'
 */

function getD(req, e) {
	var d = req.param('d');
	if (!d || d == 'undefined') d = e || '/';
	return d;
}
