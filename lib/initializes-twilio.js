var twilio = require('twilio')
	, client = null
	, tn = exports.tn = '+16144501526';

exports.initialize = function () {
	if (!client) {
		client = new twilio.RestClient('ACb381f53c9bfddea9411e111ce49af19a', '2352d78bf0367efa68a1f744b467663e');
		client.tn = tn;
	}
	return client;
};
