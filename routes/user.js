var debug = require('debug')('routes:user');
var async = require('async');
var models = require('./../lib/models');

/*
	User
*/
exports.view = function (req, res, next) {
	res.render('user/view',{ req:req });
};

exports.position = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	var steps = [];
	steps.push(function (cb) {
		req.user.loc = [Number(req.body.loc.long), Number(req.body.loc.lat)];
		req.user.save(function (err, doc) {
      require('./../bus').message({actor:req.user.id, target:req.user.id, action:'update position', created: new Date(), content: req.body.loc}).deliver();
			cb(err);
		});
	});
	['driver', 'taxi', /*'fare',*/ 'passenger'].forEach(function (k) {
		if (req.user_objects[k] && req.user_objects[k].loc) {
			steps.push(function (cb) {
				req.user_objects[k].loc = [Number(req.body.loc.long), Number(req.body.loc.lat)];
				req.user_objects[k].save(function (err, res) {
					var message = {actor:req.user.id, target:req.user_objects[k].id, action:'update position', created: new Date(), content: req.body.loc };
          require('./../bus').message(message).deliver();
					cb(err);
				});
			});
		}
	});
	async.waterfall(steps, function (err) {
		if (err) return res.json(500, err);
		res.json(200, {ok:1}); 
	});
};
