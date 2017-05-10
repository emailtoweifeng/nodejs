
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'My Safe Drop 2', req:req });
};

exports.redirect = function (req, res) {
	var d = req.query.d || req.session.d || req.param('d') || '/';
	if (d === 'undefined' || d === undefined) d = '/';
	res.redirect(302, decodeURIComponent(d));
};

exports.driver = require('./driver');
exports.fare = require('./fare');
exports.user = require('./user');
exports.image = require('./image');
exports.reset = require('./reset');
exports.code = require('./code');
exports.confirmation = require('./confirmation');
