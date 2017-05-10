var app = require('./app');
var server = require('./server');
var bus = require('./bus');
require('sticky-session')(server).listen(app.get('port'), function (err) {
  if (err) {
    console.error(err);
    return process.exit(1);
  }
  console.log('server listening on %s', app.get('port'));
});
