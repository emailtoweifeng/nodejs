var mongoose = module.exports = require('./models').mongoose;
mongoose.connection.on('open', function(err) {
	if (err) throw err;
	console.log('connection to mongodb is a success!');
});
mongoose.connection.on('close', function(err) {
	if (err) throw err;
	console.log('disconnection from mongodb is a success!');
	mongoose.connection.open();
});
