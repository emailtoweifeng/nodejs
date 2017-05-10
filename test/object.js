require('../lib/object');

var assert = require('assert');

describe("custom Object properties and methods", function () {

	describe("{}", function () {

		describe("#populated()", function () {

			it('should return false', function () {

			// {} == new Object()

				assert.equal(false, {}.populated());

			});

		});

	});

	describe('{a:1}', function () {

		describe('#populated()', function () {

			it('should return true', function () {

			// {a:1} != new Object() || {a:1} != {}

				assert.equal(true, {a:1}.populated());

			});

		});

	});

	describe('{ b: 1, c:[1,2], d:"f,0" }', function () {

		describe('#querify()', function () {

			it('should return "b=1&c=[1,2]&d=f%CF0"', function () {

				assert.equal({ b: 1, c:[1,2], d:"f,0" }.querify(), 'b=1&c=1,2&d=f,0');

			});

		});

	});

});
