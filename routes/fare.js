require('./../lib/number');

var debug = require('debug')('routes:fare');
var models = require('./../lib/models');

/*
 Fare
 */
// MK:sorting the fare queue
function compare(a,b) {
	  if (a.farequeue.miles < b.farequeue.miles)
	     return -1;
	  if (a.farequeue.miles > b.farequeue.miles)
	    return 1;
	  return 0;
	}

exports.view = function (req, res, next) {
	/*
		Only creators of the fare, drivers that own the fare, or drivers that are portentially trying to own the fare can view a fare.
	*/
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify())+'&r=1');
	if (req.fare.deleted) return res.redirect('/');
	if (!req.user.admin) {
		if (!(req.fare.status in {"active":1,"accepted":1,"canceled":1}) && !req.xhr) return res.redirect('/');
		if (!req.user_objects.driver && req.user.id != req.fare.creator.id) return res.redirect('/');
		if ((req.user.id != req.fare.creator.id) && req.user_objects.driver && req.fare.driver && req.fare.driver.id != req.user_objects.driver.id) return res.redirect('/fare/queue');
	}
        // To show the number of drivers around the passenger
         req.fare.findNearbyDrivers(function (err, drivers) {
						if (err) {
							console.error(err);
							return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
						}
            if (req.user_objects.driver) {
              drivers = drivers.filter(function (driver) { return driver.id !== req.user_objects.driver.id });
            }
             req.fare.numberofdrivers = drivers.length;
	
		// we are going to check if we are with proximity of the fare, if so we will display a pick up button
		// when we "pick up" the fare we will create a passenger record, and update the status.
		if (( (req.user_objects.driver && req.fare.driver && req.fare.driver.id == req.user_objects.driver.id ) || (req.user.admin) ) && !req.fare.passengers.length) {
//			console.warn('we are going to check if this is a fare within proximity');
			var query = {
					_id: req.fare.id,
					'loc': {
					$within: {
						$centerSphere: [
							[ req.user_objects.driver.loc[0] || req.user.loc[0] || 0, req.user_objects.driver.loc[1] || req.user.loc[1] || 0 ],
							// within 1/10 of a mile
							.1 / 3963.192
						]
					}
				}
			};
			models.Fare.findOne(query, function (err, doc) {
				if (err) {
					console.error(err);
					return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
				}
				if (doc) req.withinProximity = req.fare.withinProximity = true;	
				if (req.xhr) return res.json(req.fare);
				res.render('fare/view', {title:'This Fare', req:req});
			});
		}
		else {
			if (req.xhr) return res.json(req.fare);
			res.render('fare/view', {title:'This Fare', req:req});
		}
	});
};

exports.accept = function (req, res, next) {
	var fare = req.fare;
	if (fare.status != "active") return res.redirect('/fare/'+fare.id);
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (!req.user_objects.driver) return res.redirect('/driver/register?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (req.method == 'GET') return res.render('fare/accept', {title:'Accept This Fare', req:req});
	if (req.user_objects.driver_objects.fare) {
		if (req.xhr)
			return res.status(400).json(new Error("Driver already has a fare he is working"));
		else
			return res.redirect('/fare/'+req.user_objects.driver_objects.fare.id);
	}
	if (req.user.id == req.fare.creator.id) {
		if (req.xhr)
			return res.status(400).json(new Error("Driver can't accept his own fare"));
		else
			return res.redirect('/fare/'+fare.id);
	}
	if (!fare.driver) {
		fare.status = 'accepted';
		fare.driver = req.user_objects.driver;
		fare.taxi = req.user_objects.driver.taxi[0];
		fare.updator = req.user;
		fare.updated = new Date();
		fare.save(function (err) {
			if (err) {
				console.error(err);
				return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
			}
      require('./../bus').message({actor:req.user.id, target:fare.id, action:'fare accepted', created: new Date(), content: fare.id }).deliver();
			res.redirect('/fare/'+fare.id);
		});
	}
	else {
		res.status(500).end('This fare was already accepted');
	}
};

exports.approve = function (req, res, next) {
	if (!req.user) {
		if (req.xhr) {
			return res.json({ok:0});
		}
		else {
			return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
		}
	}
	var fare = req.fare;
	var isDriver = ((req.user.id != req.fare.creator.id) && req.user_objects.driver) ? true : false;
	if (fare.deleted || fare.status === "canceled") {
		if (req.xhr) {
			return res.json({ok:0});
		}
		else {
			if (isDriver) {
				return res.redirect('/fare/queue');
			}
			else {
				return res.redirect('/');
			}
		}
	}
	if (fare.approved) {
		if (isDriver && !fare.driver) {
			if (req.xhr) {
				return res.json({ok:0});
			}
			else {
				return res.redirect('/fare/'+fare.id+'/accept');
			}
		}
		else {
			if (req.xhr) {
				return res.json({ok:0});
			}
			else {
				return res.redirect('/fare/'+fare.id);
			}
		}
	}
	else {
		if (!fare.driver) {
			if (req.xhr) {
				return res.json({ok:0});
			}
			else {
				return res.redirect('/fare/'+fare.id+'/accept');
			}
		}
		if (isDriver) {
			console.log('req.user', req.user);
			if (req.user.id == fare.driver.user) {
        require('./../bus').message({actor:req.user.id, target:fare.creator.id, action:'request approval', created: new Date(), content: fare.id }).deliver();
				if (req.xhr) {
					return res.json({ok:1});
				}
				else {
					return res.redirect('/fare/'+fare.id+'?requested=1');
				}
			}
			else {
				if (req.xhr) {
					return res.status(500).json(new Error('You are not the driver'));
				}
				else {
					return res.redirect('/fare/'+fare.id);
				}
			}
		}
		else {
			if (fare.driver) {
				var driver = fare.driver;
				fare.approved = (req.param('approved') === 'approved' ? true : false) || false ;
				if (!fare.approved) {
					fare.status = "active";
					fare.driver = undefined; 
				}
				return fare.save(function (err) {
					if (err) {
						if (req.xhr) {
							res.status(500).json(err);
						}
						else {
							res.redirect('/fare/'+fare.id);
						}
					}
					else {
						if (req.xhr) {
              require('./../bus').message({actor:req.user.id, target:driver.user, action:'request '+(fare.approved ? 'approved' : 'denied'), created: new Date(), content: fare.id }).deliver();
							res.json({ok:1});
						}
						else {
							res.redirect('/fare/'+fare.id);
						}
					}
				});
			}
			else {
				if (req.xhr) {
					return res.status(500).json(new Error('A driver has not accepted your fare'));
				}
				else {
					return res.redirect('/fare/'+fare.id);
				}
			}
		}
	}
};

exports.cancel = function (req, res, next) {
	var fare = req.fare;
	if (fare.status == "canceled") return res.redirect('/');
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (!req.user_objects.driver && (req.user.id != fare.creator.id)) return res.redirect('/driver/register?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (!req.user.admin) {
		if (!req.user_objects.driver && req.user.id != fare.creator.id) return res.redirect('/');
		if ((req.user.id != req.fare.creator.id) && fare.driver && req.user_objects.driver && fare.driver.id != req.user_objects.driver.id) return res.redirect('/fare/'+req.fare.id);
	}
	var isDriver = ((req.user.id != req.fare.creator.id) && req.user_objects.driver) ? true : false;
	if (req.method == 'GET') return res.render('fare/cancel', {title:'Cancel This Fare', req:req});
	if (isDriver && fare.passengers.length) {
		return res.redirect('/fare/'+fare.id+'/dropoff');
	}
	else if (!isDriver && fare.passengers.length) {
		//TODO we should do something here, because the user is still in the vehicle and they just cancelled the fare
	}
	if (!isDriver || (isDriver && req.user.id == fare.creator.id)) {
		fare.status = "canceled";
		fare.deleted = true; //mark as deleted?
	}
	else {
		fare.status = "active";
		fare.driver = undefined; 
		fare.approved = false;
	}
	fare.updator = req.user.id;
	fare.updated = new Date();
	fare.save(function (err, a) {
		if (err) {
			console.error(err);
			return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
		}
		if (req.xhr) {
			if (isDriver) {
				require('./../bus').message({actor:req.user.id, target:fare.id, action:'driver cancelled fare', created: new Date(), content: fare.id }).deliver();
			}
			else {
				require('./../bus').message({actor:req.user.id, target:fare.id, action:'passenger cancelled fare', created: new Date(), content: fare.id }).deliver();
			}
			res.json(200, fare);
		}
		else {
			if (isDriver) {
				require('./../bus').message({actor:req.user.id, target:fare.id, action:'driver cancelled fare', created: new Date(), content: fare.id }).deliver();
				res.redirect('/fare/queue');
			}
			else {
				require('./../bus').message({actor:req.user.id, target:fare.id, action:'passenger cancelled fare', created: new Date(), content: fare.id }).deliver();
				res.redirect('/');
			}
		}
	});
};

exports.create = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	models.Fare.findOne({creator:req.user.id, status:{$not:{$in:['done']}}, deleted:false}, function (err, doc) {
		if (err) {
			console.error(err);
			return res.status(500).json(err); //TODO do something nice!
		}
		if (doc) {
			if (req.xhr) {
				res.json(409, new Error('An active fare already exists for this user'));
			}
			else {
				res.redirect('/fare/'+doc.id);
			}
		}
		else {
			if (req.method == 'GET') return res.render('fare/create', {title:'Create a Fare', req:req});
			var fare = new models.Fare();
			fare.loc = [Number(req.body.loc.long), Number(req.body.loc.lat)];
			fare.creator = req.user;
			fare.updator = req.user;
			fare.save(function (err) {
				if (err) {
					console.error(err);
					return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
				}
				require('./../bus').message({actor:req.user.id, target:fare.id, action:'fare created', created: new Date(), content: fare.id }).deliver();
				if (req.xhr) {
					res.json(201, fare);
				}
				else {
					res.redirect('/fare/'+fare.id);
				}
			});
		}
	});
};

exports.pickup = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (!req.user_objects.driver) res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (req.fare.passengers.length) return res.redirect('/fare/'+fare.id);
	if (req.user_objects.driver.id != req.fare.driver.id) return res.redirect('/fare/'+fare.id);
	if (req.method == 'GET') return res.render('fare/pickup', {title:'Pickup this Fare', req:req});
	var pickup = new models.Location();
	pickup.loc = [Number(req.body.loc.long), Number(req.body.loc.lat)];
	pickup.creator = req.user;
	pickup.updator = req.user;
	pickup.save(function (err, doc) {
		if (err) {
			console.error(err);
			return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
		}
		var passenger = req.passenger = new models.Passenger();
		passenger.fare = req.fare;
		passenger.user = req.fare.creator;
		passenger.driver = req.user_objects.driver; 
		passenger.loc = [Number(req.body.loc.long), Number(req.body.loc.lat)];
		passenger.taxi = req.fare.taxi = req.user_objects.driver.taxi[0];
		passenger.pickup = new Date();
		passenger.pickup_loc = pickup;
		passenger.creator = req.user;
		passenger.updator = req.user;
		passenger.save(function (err, doc) {
			if (err) {
				console.error(err);
				return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
			}
			req.fare.passengers.push(passenger);
			req.fare.updated = new Date();
			//TODO @nromano lets make a meaningful status here!
			//req.fare.status = "meaningful_status";
			req.fare.save(function (err, doc) {
				if (err) {
					console.error(err);
					return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
				}
				require('./../bus').message({actor:req.user.id, target:passenger.id, action:'picked up passenger', created: new Date(), content: passenger.id }).deliver();
				if (req.xhr) {
					res.json(200, req.fare);
				}
				else {
					res.redirect('/fare/'+req.fare.id);
				}
			});
		});
	});
};

exports.dropoff = function (req, res, next) {
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (!req.user_objects.driver) res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (!req.fare.passengers.length) return res.redirect('/fare/'+fare.id);
	if (req.user_objects.driver.id != req.fare.driver.id) return res.redirect('/fare/'+fare.id);
	if (req.method == 'GET') return res.render('fare/dropoff', {title:'Drop Off this Fare', req:req});
	models.Passenger.findById(req.fare.passengers[0].id, function (err, passenger) {
		if (err) {
			console.error(err);
			return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
		}
		var dropoff = new models.Location();
		dropoff.loc = [Number(req.body.loc.long), Number(req.body.loc.lat)];
		dropoff.creator = req.user;
		dropoff.updator = req.user;
		dropoff.save(function (err, doc) {
			if (err) {
				console.error(err);
				return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
			}
			passenger.updator = req.user;
			passenger.updated = new Date();
			passenger.dropoff = new Date();
			passenger.dropoff_loc = dropoff;
			passenger.save(function (err, doc) {
				if (err) {
					console.error(err);
					return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
				}
				//TODO @nromano lets make a meaningful status here!
				//req.fare.status = "meaningful_status";
				req.fare.status = "done";
				req.fare.save(function (err) {
					console.error(err);
					if (err) return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
					require('./../bus').message({actor:req.user.id, target:passenger.id, action:'dropped off passenger', created: new Date(), content: passenger.id }).deliver();
					if (req.xhr) {
						res.json(200, req.fare);
					}
					else {

						if (req.user_objects.driver)
							res.redirect('/fare/queue')
						else
							res.redirect('/fare/'+req.fare.id);
					}
				});
			});
		});
	});
};

exports.confirmPickup = function (req, res, next) {
	if (!req.user) return res.status(401).json(new Error('Need to be logged in'))
	if (req.user.id != req.fare.creator.id) return res.status(403).json(new Error('Only the creator can confirm the pickup'))
	req.fare.pickupConfirmed = req.body.safe ? 1 : 0;
	req.fare.updated = new Date()
	req.fare.updator = req.user
	req.fare.save(function (err) {
		if (err) return res.status(500).json(err)
		require('./../bus').message({actor:req.user.id, target:req.fare.id, action:'pick up confirmed', created: new Date(), content: req.fare.id }).deliver();
		res.json({ok:1})
	});
};

exports.confirmDropoff = function (req, res, next) {
	if (!req.user) return res.status(401).json(new Error('Need to be logged in'))
	if (req.user.id != req.fare.creator.id) return res.status(403).json(new Error('Only the creator can confirm the dropoff'))
	req.fare.dropoffConfirmed = req.body.safe ? 1 : 0;
	req.fare.updated = new Date()
	req.fare.updator = req.user
	req.fare.save(function (err) {
		if (err) return res.status(500).json(err)
		require('./../bus').message({actor:req.user.id, target:req.fare.id, action:'drop off confirmed', created: new Date(), content: req.fare.id }).deliver();
		res.json({ok:1})
	});
};

exports.rate = function (req, res, next) {
	if (!req.user) return res.status(401).json(new Error('Need to be logged in'))
	if (req.user.id != req.fare.creator.id) return res.status(403).json(new Error('Only the creator can confirm the pickup'))
	if (req.fare.status !== 'done') return res.redirect('/');
	if (req.method === 'GET') {
		res.render('fare/rate', { req:req });
	}
	else if (req.method === 'POST') {
		models.Driver.findById(req.fare.driver.id).exec(function (err, driver) {
			if (err) return res.status(500).json(err);
      var rating = Number(req.body.rating);
			rating >= 1 && rating <= 5 ? rating : 0;
		  driver.ratingCount += 1;
			if (rating > 0) {
				driver.ratingSum += rating;
				driver.save(function (err) {
					if (err) return res.status(500).json(err);
					res.redirect('/');
				});
			}
			else {
				res.redirect('/');
			}
		});
	}
	else {
		res.redirect('/');
	}
};

exports.queue = function (req, res, next) {
	//TODO I'd like to use socket.io and stream this information after the request is made
	if (!req.user) return res.redirect('/login?d='+encodeURI(req.path+'?'+req.query.querify()));
  if (!req.user_objects.driver) return res.redirect('/driver/register?d='+encodeURI(req.path+'?'+req.query.querify()));
	if (req.user_objects.driver && req.user_objects.driver_objects.fare) return res.redirect('/fare/'+req.user_objects.driver_objects.fare.id);

  var query = {
      'loc': {
      $within: {
        $centerSphere: [
          req.user.loc,
          20 / 3963.192
        ]
      }
    },
    status:'active',
    driver:{$exists: false},
    deleted:false
  };
  var driverLat = req.user.loc[1] || 0;
  var driverLong = req.user.loc[0] || 0;
  models.Fare.find(query).populate('creator').exec(function (err, docs) {
    if (err) {
      console.error(err);
      return res.status(500).end(JSON.stringify(err)); //TODO do something nice!
    }
    req.docs = docs.filter(function(doc) {
      if (doc.creator.id != req.user.id) {
        //console.log('doc', doc);
        /*
        var precision = 4;
        var R = 6371;
        var currentDate = new Date();
        var timeDiff = Math.abs(currentDate.getTime() - doc.created.getTime());
        var diffDays = Math.round(timeDiff / 86400000); // days
        var diffHrs = Math.round((timeDiff % 86400000) / 3600000); // hours
        var diffMins = Math.round(((timeDiff % 86400000) % 3600000) / 60000); // minutes
        var timeInQueue = diffDays + ' Days ' + diffHrs + ' Hours ' + diffMins + ' Mins';
        var lat1 = Number(doc.loc[1]).toRad(), 
        lon1 = Number(doc.loc[0]).toRad();
        var lat2 = Number(doc.creator.loc[1]).toRad(),
        lon2 =  Number(doc.creator.loc[0]).toRad();
        var dLat = lat2 - lat1;
        var dLon = lon2 - lon1;
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1) * Math.cos(lat2) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = (R * c);
        var miles = d.toPrecisionFixed(precision);
        doc.farequeue = {id : doc.id, createdtime : doc.created, timeInQueue : timeInQueue, status : doc.status, miles : miles,  driverLat : req.user.loc[1], driverLon : req.user.loc[0], passLat : doc.creator.loc[1], passLon : doc.creator.loc[0]};
        */
        doc.creator = undefined;
        return true;
      }
      return false;
    }).sort(compare);
    res.render('fare/queue',{title:'Fare Queue', req:req });
  });
};
