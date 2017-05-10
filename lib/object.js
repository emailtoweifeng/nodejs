
/**
 * This will return true/false is the object
 * has enumerable properties
 */
Object.defineProperty(Object.prototype, 'populated', { value: function() {
	for (k in this) return true;
	return false;
}});

/* 
 * This method will allow the method "queryify" to be called on it,
 * which will produce a query string
 *
 * e.g.
 *
 * var a = { b: 1, c:[1,2], d:"f,0" };
 *
 * var b = a.queryify();
 *
 * console.log(b) => 'b=1&c=[1,2]&d=f%CF0'
 *
 * It would be cool if serialize of arrays did this c[0]=1&c=[1]=2 TODO @nromano
 */

Object.defineProperty(Object.prototype, 'querify', { value: function () {
	if (typeof this == 'object') {
		if (this instanceof Array) return encodeURI(this.valueOf());
		var s = [];	
		for (var k in this) {
			s.push(k+'='+encodeURI(this[k]));
		}
		return s.join('&');
	}
	else {
		return encodeURI(this.valueOf());
	}
}});


// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function () {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}


// borrowed from 
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
if (!Array.prototype.filter)
{
  Array.prototype.filter = function(fun /*, thisArg */)
  {
    "use strict";

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== "function")
      throw new TypeError();

    var res = [];
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++)
    {
      if (i in t)
      {
        var val = t[i];

        // NOTE: Technically this should Object.defineProperty at
        //       the next index, as push can be affected by
        //       properties on Object.prototype and Array.prototype.
        //       But that method's new, and collisions should be
        //       rare, so use the more-compatible alternative.
        if (fun.call(thisArg, val, i, t))
          res.push(val);
      }
    }

    return res;
  };
}
