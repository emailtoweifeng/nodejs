var expressSession = require('express-session');
var RedisStore = require('connect-redis')(expressSession);
var store = new RedisStore();
var config = exports.config = { secret:'my little korean makes awesome fucking food!!', key:'safedrop'+(process.env.NODE_ENV!='production' ? 'd' : '')+'.sid', store:store };
