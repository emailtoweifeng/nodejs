var models = require('./../lib/models');

exports.view = function (req, res) {
	res.render('code', {req:req, errors:[]});
};

exports.validate = function (req, res) {
	if (!req.body.phone) return res.redirect('/code');
	if (!req.body.code) return res.redirect('/code?phone='+req.body.phone);
	if (!req.body.password || !req.body.password_two) return res.render('code', {req:req, errors:['Enter new password']});
	if (req.body.password != req.body.password_two) return res.render('code', {req:req, errors:['Passwords do not match']});
	if (!req.body.pin || req.body.pin.length !== 4 ) return res.render('code', {req:req, errors:['Pin must be 4 digits']});
	models.User.findOne({phone: req.body.phone}, function (err, user) {
		if (err) return res.render('reset', {req:req, errors:[err.toString()]});
		if (!user) return res.render('reset', {req:req, errors:['User not found']});
    console.log('user.code === req.body.code? %s, %s', user.code, req.body.code);
		if (user.code !== req.body.code) return res.render('code', {req:req, errors:['Incorrect code']});
		user.code = null;
		user.password = req.body.password;
    user.pin = req.body.pin;
		user.save(function (err) {
			if (err) return res.render('reset', {req:req, errors:[err.toString()]});
			res.redirect('/login');	
		});
	});
};
