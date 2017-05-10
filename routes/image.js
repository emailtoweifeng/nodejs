var fs = require('fs')
	, base = __dirname + '/../uploads/'
	;

exports.upload = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (req.method === 'GET') {
		res.render('image', {});
	}
	else if (req.method === 'POST') {
		fs.readFile(req.files.image.path, function (err, data) {
			var name = req.files.image.path.split('/').pop();
			fs.writeFile(base + name, data, function (err) {
				if (err) return next(err);
				req.user.imageSource = name;
				req.user.save(function (err) {
					if (err) return next(err);
					res.redirect('/image/'+name);
				});
			});
		});
	}
};

exports.view = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	res.sendfile(req.param('image'), {root:base});
};
