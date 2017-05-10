var debug = require('debug')('server');
var app = require('./app');
var server = module.exports = require('http').Server(app);
