var models = require('./../lib/models')
	, client = require('./../lib/initializes-twilio').initialize()
	;

exports.view = function (req, res) {
	res.render('reset', {req:req, errors: []});
};

exports.generate = function (req, res) {
	if (!req.body.phone) return res.redirect('/reset');
	models.User.findOne({phone: req.body.phone}, function (err, user) {
		if (err) return res.render('reset', {req:req, errors:[err.toString()]});
		if (!user) return res.render('reset', {req:req, errors:['User not found']});
		var code = getCode();
		user.code = code;
		user.save(function (err) {
			if (err) return res.render('reset', {req:req, errors:[err.toString()]});
			client.sendMessage({
				to:'+1'+user.phone,
				from:client.tn,
				body:'Your password reset code: ' + code 
			}, function (err, data) {
				if (err) return res.render('reset', {req:req, errors:[err.toString()]});
				res.redirect('/code?phone='+user.phone);
			});
		});
	});
};

function getCode () {
	var code = [];
	for (var i=0; i<6; i++) {
		code.push(random(0,9));
	}
	return code.join('');
}

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
