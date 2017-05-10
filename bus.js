var debug = require('debug')('taxi:bus');
var server = require('./server');
var Session = require('bus.io-session');
var models = require('./lib/models');
var session = require('./lib/session');
var utility = require('./lib/utility');
var Common = require('bus.io-common');
var Path = { NONE: 0, IN: 1, ON: 2, OUT: 3 };

// TODO refactor this out, it is also in app.
var getUsersObjects = utility.buildGetUsersObjects('user')
	, getDriversObjects = utility.buildGetDriversObjects('user_objects')
	, getUserInfo = function (id, cb) {
			var data = {};
			models.User.findById(id, function (err, user) {
				if (err) return cb(err);
				data.user = user;	
				getUsersObjects(data, {}, function (err) {
					if (err) return cb(err);
					if (data.user_objects.driver) {
						getDriversObjects(data, {}, function (err) {
							if (err) return cb(err);
							cb(null, data);
						});
					}
					else {
						cb(null, data);
					}
				});
			});
		}
	;

var bus = require('bus.io')(server);
bus.use(Session(session.config));

bus.exchange().on('error', function (err) {
  console.error('an error occured on the exchange');
  console.error(err);
});

bus.queue().on('error', function (err) {
  console.error('an error occured on the queue');
  console.error(err);
});

bus.pubsub().on('error', function (err) {
  console.error('an error occured on the pubsub');
  console.error(err);
});

bus.socket(function (sock) {
  try {
    var id = sock.handshake.session.auth.userId
  }
  catch(e) { }
  if (!id) return;
  models.Message.find({sock:sock.id, target:id, viewed:null, path:Path.OUT}).sort({created:-1}).limit(10).exec(function (err, docs) {
    if (err) {
      console.error(err);
      return;
    }
    var msgs = [];
    docs.forEach(function (doc) {
      debug('need to ack %j', doc);
      var msg = Common.Message(doc);
      msg.data.id = doc._id;
      msgs.push(msg);
    });
    debug('number of msgs to deliver %s', msgs.length);
    sock.emit('msgs', msgs);
  });
});

bus.actor(function (socket, cb) {
  debug('actor %s', socket.handshake.session.auth.userId);
  cb(null, socket.handshake.session.auth.userId);
});

bus.in(function (msg, sock, next) {
  debug('in %s %s %s %s', msg.actor(), msg.action(), msg.content(), msg.target());
  next();
});

bus.in('ack', function (msg, sock) {
  msg.consume();
  models.Message.findByIdAndUpdate(msg.content(), {viewed:new Date()}, function (err, doc) {
    if (err) {
      debug('in ack msg %s failure', msg.id());
      console.error(err);
      return;
    }
    else {
      debug('in ack msg %s success', msg.id());
    }
  });
});

bus.on(function (msg, next) {
  debug('on %s %s %s %s', msg.actor(), msg.action(), msg.content(), msg.target());
  new models.Message(merge(msg.data,{viewed:new Date(), path:Path.ON})).save(function (err, doc) {
		if (err) {
      msg.consume();
      return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    }
    next();
  });
});

bus.on('update position', function (msg, next) {
  msg.consume();
  if (msg.actor() !== msg.target()) return;
  getUserInfo(msg.actor(), function (err, info) {
    //debug('got user info?', err, info);
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    if (info.user_objects.fare) {
      debug('user objects fare');
      if (info.user_objects.fare.driver) {
        debug('user objects fare driver');
        info.user_objects.fare.getWithinProximityOf(info.user_objects.fare.driver, function (err, within) {
          debug('within prox', err, within);
          if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
          msg.content().within = within;
          bus.message({actor:msg.actor(), target:msg.target(), action:'passenger position updated', content: msg.content(), created: msg.created()}).deliver(msg.target(), info.user_objects.fare.driver.user);
        });
      }
      else {
        debug('on finding nearby drivers');
        info.user_objects.fare.findNearbyDrivers(function (err, drivers) {
          var byid = {};
          drivers.forEach(function (driver) { byid[driver.id] = driver; });
          debug('on finding drivers that do not have a fare');
          models.Fare.find({status:'accepted', driver:{$in:Object.keys(byid)}}).exec(function (err, fares) {
            if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
            fares.forEach(function (fare) { if (byid[fare.driver]) delete byid[fare.driver]; });
            debug('on we have these drivers nearby', Object.keys(byid));
            var m = bus.message({actor:msg.actor(), target:msg.target(), action:'passenger position updated', content: msg.content(), created: msg.created() });
            m.deliver();
            Object.keys(byid).filter(function (a) { 
              console.log('a %s, byid[a], %s, fare.creator.id %s', a, byid[a], msg.data.actor);
              return (byid[a] && byid[a].user != msg.data.actor)
            }).forEach(function (key) {
              m.deliver(byid[key].user);
            });
          });
        });
      }
    }
    if (info.user_objects.driver_objects) {
      if (info.user_objects.driver_objects.fare) {
        info.user_objects.driver_objects.fare.getWithinProximityOf(info.user_objects.driver, function (err, within) {
          if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
          msg.content().within = within;
          bus.message({actor:msg.actor(), target:msg.target(), action:'driver position updated', content: msg.content(), created: msg.created()}).deliver(msg.target(), info.user_objects.driver_objects.fare.creator);
        });
      }
    }
  });
});

bus.on('fare created', function fareCreated (msg) {
  msg.consume();
  debug('on finding fare by id');
  models.Fare.findById(msg.content()).populate('taxi').populate('creator').populate('driver').populate('passenger').exec(function (err, fare) {
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    debug('on finding nearby drivers');
    fare.findNearbyDrivers(function (err, drivers) {
      var byid = {};
      drivers.forEach(function (driver) { byid[driver.id] = driver; });
      debug('on finding drivers that do not have a fare');
      models.Fare.find({status:'accepted', driver:{$in:Object.keys(byid)}}).exec(function (err, fares) {
        if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
        fares.forEach(function (fare) { if (byid[fare.driver]) delete byid[fare.driver]; });
        debug('on we have these drivers nearby', Object.keys(byid));
        msg.content(fare);
        Object.keys(byid).filter(function (a) { 
          console.log('a %s, byid[a], %s, fare.creator.id %s', a, byid[a], fare.creator.id);
          return (byid[a] && byid[a].user != fare.creator.id)
        }).forEach(function (key) {
          msg.deliver(byid[key].user);
        });
      });
    });
  });
});

bus.on('fare accepted', function fareAccepted (msg) {
  msg.consume();
  debug('on finding fare by id');
  models.Fare.findById(msg.content()).populate('taxi').populate('creator').populate('driver').populate('passenger').exec(function (err, fare) {
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    debug('on determining if we are within proximity');
    fare.getWithinProximityOf(fare.driver, function (err, within) {
      if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
      debug('on letting the fare creator and the actor know the fare was accepted creator %s, actor %s', fare.creator.id, msg.actor());
      msg.content(fare).deliver(fare.creator.id, msg.actor());
      fare.findNearbyDrivers(function (err, drivers) {
        var byid = {};
        drivers.forEach(function (driver) { byid[driver.id] = driver; });
        debug('on finding drivers that do not have a fare');
        models.Fare.find({status:'accepted', driver:{$in:Object.keys(byid)}}).exec(function (err, fares) {
          if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
          fares.forEach(function (fare) { if (byid[fare.driver]) delete byid[fare.driver]; });
          debug('on we have these drivers nearby', Object.keys(byid));
          msg.content(fare);
          if (fare.driver) byid[fare.driver.id] = fare.driver;
          Object.keys(byid).forEach(function (key) {
            msg.deliver(byid[key].user);
          });
        });
      });
    });
  });
});

bus.on('driver cancelled fare', function driverCancelledFare (msg) {
  msg.consume();
  debug('on finding fare by id');
  models.Fare.findById(msg.content()).populate('taxi').populate('creator').populate('driver').populate('passenger').exec(function (err, fare) {
    if (err) return ({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    debug('on letting the fare creator that the driver cancelled the fare');
    msg.content(fare).deliver(fare.creator.id);
  });
});

bus.on('passenger cancelled fare', function passengerCancelledFare (msg) {
  msg.consume();
  debug('on finding fare by id');
  models.Fare.findById(msg.content()).populate('creator').populate('driver').populate('passenger').exec(function (err, fare) {
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver();
    debug('on if we have a driver on this fare let the driver know that the fare has been cancelled');
    fare.findNearbyDrivers(function (err, drivers) {
      var byid = {};
      drivers.forEach(function (driver) { byid[driver.id] = driver; });
      debug('on finding drivers that do not have a fare');
      models.Fare.find({status:'accepted', driver:{$in:Object.keys(byid)}}).exec(function (err, fares) {
        if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
        fares.forEach(function (fare) { if (byid[fare.driver]) delete byid[fare.driver]; });
        debug('on we have these drivers nearby', Object.keys(byid));
        msg.content(fare);
        if (fare.driver) byid[fare.driver.id] = fare.driver;
        Object.keys(byid).forEach(function (key) {
          msg.deliver(byid[key].user);
        });
      });
    });
  });
});

bus.on('picked up passenger', function pickedUpPassenger (msg) {
  msg.consume();
  debug('on finding passenger by id');
  models.Passenger.findById(msg.content()).exec(function (err, passenger) {
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    debug('on finding fare by id');
    models.Fare.findById(passenger.fare).populate('creator').populate('driver').populate('passenger').exec(function (err, fare) {
      if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
      debug('on determining if we are within proximity of the passenger');
      fare.getWithinProximityOf(fare.driver, function (err, within) {
        if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
        debug('on let the creator of the fare and the actor know the passenger has been picked up');
        msg.content(fare).deliver(fare.creator.id, msg.actor());
      });
    });
  });
});

bus.on('dropped off passenger', function droppedOffPassenger (msg) {
  msg.consume();
  debug('on finding passenger by id');
  models.Passenger.findById(msg.content()).exec(function (err, passenger) {
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    debug('on finding fare by id');
    models.Fare.findById(passenger.fare).populate('creator').populate('driver').populate('passenger').exec(function (err, fare) {
      if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
      debug('on let the creator of the fare and the actor know the passenger has been dropped off');
      msg.content(fare).deliver(fare.creator.id, msg.actor());
    });
  });
});

bus.on('request approval', function requestApproval (msg) {
  msg.consume();
  debug('on finding fare by id');
  models.Fare.findById(msg.content()).populate('driver').exec(function (err, fare) {
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    debug('on let the fare creator and the actor know about the approval request');
    msg.content(fare).deliver(fare.creator, msg.actor());
  });
});


bus.on('request approved', function requestApproved (msg) {
  msg.consume();
  debug('on finding fare by id');
  models.Fare.findById(msg.content()).exec(function (err, fare) {
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    debug('on let the fare creator and the actor know about the approval request was approved');
    msg.content(fare).deliver(msg.target(), msg.actor());
  });
});

bus.on('request denied', function requestDenied (msg) {
  msg.consume();
  debug('on finding fare by id');
  models.Fare.findById(msg.content()).exec(function (err, fare) {
    if (err) return bus.message({actor:process.pid, target:msg.target(), action:'error', content: err, created: new Date() }).deliver(msg.actor());
    debug('on let the fare creator and the actor know about the approval request was denied');
    msg.content(fare).deliver(msg.target(), msg.actor());
  });
});

var these = [
  'fare accepted',
  'driver cancelled fare', 
  'passenger cancelled fare',
  'picked up passenger',
  'dropped off passenger',
  'request approval',
  'request approved',
  'request denied'
];

bus.out(function (msg, sock, next) {
  if (~these.indexOf(msg.action())) {
    debug('out saving msg %s %s', msg.id(), msg.action());
    new models.Message(merge(msg.data, {viewed:null, sock:sock.id, path:Path.OUT})).save(function (err, doc) {
      if (err) {
        console.error(err);
      }
      debug('out saved out msg %s %s', msg.id(), msg.action());
      next();
    });
  }
  else {
    debug('out skipping msg %s %s', msg.id(), msg.action());
    next();
  }
});

bus.out('driver position updated', function (msg, sock, next) {
  debug('out driver position updated %j', msg.data);
  next();
});

bus.out(function (msg, sock, next) {
  debug('out delivering %s %s to %s %s', msg.id(), msg.action(), msg.target(), sock.id);
  next();
});

function merge (a, b) {
  if (b) {
    for (var k in b) {
      a[k] = b[k];
    }
  }
  return a;
}

module.exports = bus;
