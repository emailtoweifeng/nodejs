var async = require('async')
	, models = require('./models')
	;

/*
 * this method will create a request handler that will retreive a resource given the param type field and they sub fields of that model that need populated
 */

exports.buildParamHandler = function (model,field,populate) {
	
	//the field or model name
	var lc = field || model.toLowerCase()

	//the class of the mongoose model
	  , klazz = models.mongoose.model(model);

	//this is handler we are building
	return function (req, res, next, id) { //it accepts the req, res, next, and id fields (this is what express passes to this function)

		//this function will be used as a callback inside of this function
		function cb (err, doc) { 
			if (err) {
				if (err.name == 'CastError') return res.status(404).header('Content-Type','text/html').send('404<br /><a href="/">Home</a>');
				return res.status(500).json(err); //TODO send a 500
			}
			if (!doc) return res.status(404).header('Content-Type','text/html').send('404<br /><a href="/">Home</a>');
			req[lc] = doc;	
			next();
		}

		//if we were asked to populate sub docs on the model
		if (populate) {
			if (populate instanceof Array) {
				var chain = klazz.findById(id); //each mongoose method on a class returns the class instance which can be used for chaining, that is done here
				populate.forEach(function (thing) {
					 chain = chain.populate(thing);
				});
				//the prev block takes this ['user','taxi','passenger'] and produces this statement dynamically  klazz.populate('user').popualte('taxi').populate('passenger').exec(cb);
				chain.exec(cb);
			}
			else {
				//since we do not want to populate a list of sub docs, just do the one that was passed
					klazz.findById(id).populate(populate).exec(cb);
			}
		}
		else {
			//no populate is necessary find the resource and move on to our "cb"
			klazz.findById(id, cb);
		}
	};
}

/*
 * This function will rediect /res to /res/1 in a dev env  and in a prod env it will redirection /user to /user/23r382994jac9ds0 or whatever the id of the current users resource is
 */

exports.buildModelRedirectHandler = function (model) {
	return function (req, res, next ) {
		if (!req[model] && app.get('env') == 'development') {
			return res.redirect(302, '/'+model+'/1');	
		}
		else {
			return res.redirect(302, '/'+model+'/'+req[model].id);
		}
	};
}

/*
 * These will populate search criteria given GET requests to eliminate unbound queries
 */

exports.buildStandardSearchFilters = function () {
	return function (req, res, next) {
		if (req.method != 'GET') next();
		req.query.status = 'active';
		next();
	};
}

/*
 * This function will get the current users objects
 */

exports.buildGetUsersObjects = function (key) {
	return function (req, res, next) {
		var thing = req[key] 
		if (!thing) return next()
		async.parallel({
			driver: function (cb) {
				models.Driver	
					.findOne({creator:thing.id, status:'active', deleted:false})
					.populate('taxi')
					.exec(cb)
			},
			fare: function (cb) {
				models.Fare	
					.findOne({creator:thing.id, status:{$in:['active','accepted']}, deleted:false})
					.populate('taxi')
					.populate('driver')
					.populate('passenger')
					.exec(cb)
			}
		}, function (err, user_objects) {
			if (err) return next(err)
			req[key+'_objects'] = user_objects || {}
			//console.log('req['+key+'_objects]', user_objects);
			next();
		})
	}
}

exports.buildGetDriversObjects = function (key) {
	return function (req, res, next) {
		var thing = key ? (req[key] && req[key].driver ? (req[key].driver) : (req[key])) : (req.driver)

		if (!thing) return next();
		async.parallel({
			fare: function (cb) {
			//TODO check this out because I do no tthink this is getting populated
				models.Fare
					.findOne({driver:thing.id, status:{$in:['active','accepted']}, deleted:false})
					.populate('taxi')
					.exec(cb)
			},
			taxi: function (cb) {
				models.Taxi	
					.findOne({driver:thing.id, status:{$in:['active']}, deleted:false})
					.exec(cb)
			}
		}, function (err, driver_objects) {
			if (err) return next(err);
			
			(key ? req[key] : req).driver_objects = driver_objects || {}
			//console.log('req['+key+'].driver_objects', driver_objects);
			next();
		});
	}
};
