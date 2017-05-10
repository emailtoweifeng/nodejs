
if (typeof Number.prototype.toPrecisionFixed == 'undefined') {
	  Number.prototype.toPrecisionFixed = function(precision) {
	    
	    // use standard toPrecision method
	    var n = this.toPrecision(precision);
	    
	    // ... but replace +ve exponential format with trailing zeros
	    n = n.replace(/(.+)e\+(.+)/, function(n, sig, exp) {
	      sig = sig.replace(/\./, '');       // remove decimal from significand
	      l = sig.length - 1;
	      while (exp-- > l) sig = sig + '0'; // append zeros from exponent
	      return sig;
	    });
	    
	    // ... and replace -ve exponential format with leading zeros
	    n = n.replace(/(.+)e-(.+)/, function(n, sig, exp) {
	      sig = sig.replace(/\./, '');       // remove decimal from significand
	      while (exp-- > 1) sig = '0' + sig; // prepend zeros from exponent
	      return '0.' + sig;
	    });
	    
	    return n;
	  };
	}

/** Converts numeric degrees to radians */
if (typeof Number.prototype.toRad == 'undefined') {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  };
}

