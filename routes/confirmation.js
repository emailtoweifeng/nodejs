var client = require('./../lib/initializes-twilio').initialize()
;

exports.check = function (req, res, next) {
	if (!req.user || req.user.confirmed !== null) {
		next();
	}
	else {
		if (req.user.code) {
			res.redirect('/confirmation?d='+encodeURIComponent(req.originalUrl));
		}
		else {
			res.redirect('/confirmation/code?d='+encodeURIComponent(req.originalUrl));
		}
	}
};

exports.view = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURIComponent(req.originalUrl));
	if (req.user.confirmed) return res.redirect('/');
	res.render('code2', {req:req, errors: []});
};

exports.validate = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURIComponent(req.originalUrl));
	if (req.user.confirmed) return res.redirect('/');
  console.log('req.user.code %s, req.body.code %s', req.user.code, req.body.code);
	if (req.user.code === req.body.code) {
		req.user.confirmed = new Date();
		req.user.save(function (err) {
			if (err) {
				return res.render('code2', {req:req, errors:[err]});
			}
			return res.redirect(req.param('d') ? decodeURIComponent(req.param('d')) :'/');
		});
	}
	else {
		res.render('code2', {req:req, errors:['Invalid code!']});
	}
};

exports.generate = function (req, res) {
	if (!req.user) return res.redirect('/login?d='+encodeURIComponent(req.originalUrl));
	if (req.user.confirmed) return res.redirect('/');
	var code = getCode();
	req.user.code = code;
	req.user.save(function (err) {
		if (err) return res.render('reset', {req:req, errors:[err.toString()]});
		console.log('req.user.phone', req.user.phone);
		client.sendMessage({
			to:'+1'+req.user.phone,
			from:client.tn,
			body:'My Safe Drop - Taxi\nYour confirmation code: ' + code 
		}, function (err, data) {
			if (err) return res.render('code2', {req:req, errors:[err.toString()]});
			res.redirect('/confirmation?d='+encodeURIComponent(req.param('d')));
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
