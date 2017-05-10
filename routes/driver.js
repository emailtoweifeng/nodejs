var models = require('./../lib/models');
/*
	Driver
*/
exports.register = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (req.method == 'GET') return	res.render('driver/register',{req: req, title:'Driver Registration'});
	models.Driver.findOne({status:'active', deleted:false, user:req.user.id}, function (err, doc) {
		if (err) return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
		if (doc) return res.redirect('/driver/'+doc.id);
		var taxi = new models.Taxi();
		taxi.creator = req.user;
		taxi.updator = req.user;
		taxi.license = req.body.taxi.license;
		taxi.save(function(err) {
			if (err) return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
			var driver = new models.Driver();
			driver.user = req.user;
			driver.license = req.body.license;
			driver.creator = req.user;
			driver.updator = req.user;
			driver.taxi.push(taxi);
			driver.save(function (err, doc) {
				if (err) return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
				res.redirect(req.param('d') ? '/r?d='+req.param('d') : '/');
			});
		});
	});
};
