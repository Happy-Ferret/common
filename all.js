// scope: all javascript files
function compareIntThenLex(a, b) {
    // sort ascending by integer, and then lexically
	// ['1', '10', '2'] ->
	// ['1', '2', '10']

    let inta = parseInt(a);
    let intb = parseInt(b);
    let isaint = !isNaN(inta);
    let isbint = !isNaN(intb);
    if (isaint && isbint) {
        return inta - intb; // sort asc
    } else if (isaint && !isbint) {
        return -1; // sort a to lower index then b
    } else if (!isaint && isbint) {
        return 1; // sort b to lower index then a
    } else {
        // neither are int's
        return a.localeCompare(b)
    }
}

function dedupeCaseInsensitive(arr) {
  // removes duplicates in array. case insensitively.
  // based on "Hashtables to the rescue" - http://stackoverflow.com/a/9229821/1828637
  let ixlast = arr.length - 1;
  return arr.reduce(
    (acc, el, ix) => {
      let el_low = el.toLowerCase();
      let { seen, filtered } = acc;
      if (!seen.hasOwnProperty(el_low)) {
        seen[el_low] = true;
        filtered.push(el);
      }
      return ix === ixlast ? filtered : acc;
    },
    { seen:{}, filtered:[] }
  );
}

function deepAccessUsingString(obj, dotpath, defaultval){
    // defaultval is returned when it is not found, by default, defaultval is undefined, set it to "THROW" if you want it to throw

    let keys = dotpath.split('.');
    let nested = obj;
    for (let key of keys) {
        if (nested && key in nested) nested = nested[key]; // `key in nested` this is point of concern. as `in` works with Array,Set,Map (and i dont know maybe more type) too. i am assuming that nested is always an object
        else
            if (defaultval === 'THROW') throw 'deepAccessUsingString: missing';
            else return defaultval;
    }

    return nested;
}

// http://stackoverflow.com/a/1144249/1828637
function deepCompare () {
  var i, l, leftChain, rightChain;

  function compare2Objects (x, y) {
    var p;

    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
         return true;
    }

    // Compare primitives and functions.
    // Check if both arguments link to the same object.
    // Especially useful on the step where we compare prototypes
    if (x === y) {
        return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if ((typeof x === 'function' && typeof y === 'function') ||
       (x instanceof Date && y instanceof Date) ||
       (x instanceof RegExp && y instanceof RegExp) ||
       (x instanceof String && y instanceof String) ||
       (x instanceof Number && y instanceof Number)) {
        return x.toString() === y.toString();
    }

    // At last checking prototypes as good as we can
    if (!(x instanceof Object && y instanceof Object)) {
        return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
        return false;
    }

    if (x.constructor !== y.constructor) {
        return false;
    }

    if (x.prototype !== y.prototype) {
        return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
         return false;
    }

    // Quick checking of one object being a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }
    }

    for (p in x) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }

        switch (typeof (x[p])) {
            case 'object':
            case 'function':

                leftChain.push(x);
                rightChain.push(y);

                if (!compare2Objects (x[p], y[p])) {
                    return false;
                }

                leftChain.pop();
                rightChain.pop();
                break;

            default:
                if (x[p] !== y[p]) {
                    return false;
                }
                break;
        }
    }

    return true;
  }

  if (arguments.length < 1) {
    return true; //Die silently? Don't know how to handle such case, please help...
    // throw "Need two or more arguments to compare";
  }

  for (i = 1, l = arguments.length; i < l; i++) {

      leftChain = []; //Todo: this can be cached
      rightChain = [];

      if (!compare2Objects(arguments[0], arguments[i])) {
          return false;
      }
  }

  return true;
}

async function doRetries(retry_ms, retry_cnt, callback) {
	// callback should return promise
	// total_time = retry_ms * retry_cnt
	for (let i=0; i<retry_cnt; i++) {
		try {
			return await callback(retry_cnt);
		} catch(err) {
			console.warn('retry err:', err, 'attempt, i:', i);
            if (err && typeof(err) == 'object' && err.STOP_RETRIES) { // STOP_RETRIES short for STOP_RETRIES_AND_THROW
                delete err.STOP_RETRIES;
                throw err;
            };
			if (i < retry_cnt-1) await promiseTimeout(retry_ms);
			else throw err;
		}
	}
}

function escapeRegExp(text) {
	if (!arguments.callee.sRE) {
		var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
		arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
	}
	return text.replace(arguments.callee.sRE, '\\$1');
}

// rev3 - https://gist.github.com/Noitidart/110c2f859db62398ae76069f4a6c5642
/**
 * Selects the closest matching locale from a list of locales.
 *
 * @param  aLocales
 *         An array of available locales
 * @param  aMatchLocales
 *         An array of prefered locales, ordered by priority. Most wanted first.
 *         Locales have to be in lowercase.
 * @return the best match for the currently selected locale
 *
 * Stolen from http://mxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/internal/XPIProvider.jsm
 */
function findClosestLocale(aLocales, aMatchLocales) {
  aMatchLocales = aMatchLocales;

  // Holds the best matching localized resource
  let bestmatch = null;
  // The number of locale parts it matched with
  let bestmatchcount = 0;
  // The number of locale parts in the match
  let bestpartcount = 0;

  for (let locale of aMatchLocales) {
    let lparts = locale.split(/[-_]/);
    for (let localized of aLocales) {
      let found = localized.toLowerCase();
      // Exact match is returned immediately
      if (locale == found)
        return localized;

      let fparts = found.split(/[-_]/);
      /* If we have found a possible match and this one isn't any longer
         then we dont need to check further. */
      if (bestmatch && fparts.length < bestmatchcount)
        continue;

      // Count the number of parts that match
      let maxmatchcount = Math.min(fparts.length, lparts.length);
      let matchcount = 0;
      while (matchcount < maxmatchcount &&
             fparts[matchcount] == lparts[matchcount])
        matchcount++;

      /* If we matched more than the last best match or matched the same and
         this locale is less specific than the last best match. */
      if (matchcount > bestmatchcount ||
         (matchcount == bestmatchcount && fparts.length < bestpartcount)) {
        bestmatch = localized;
        bestmatchcount = matchcount;
        bestpartcount = fparts.length;
      }
    }
    // If we found a valid match for this locale return it
    if (bestmatch)
      return bestmatch;
  }
  return null;
}

async function getUnixTime(opt={}) {
	// retry_cnt is used for times to retry each each server
	opt = {
		timeout: 10000,
		compensate: true, // subtracts half of the xhr request time from the time extracted from page
		...opt
	};

	let servers = [
		{
			name: 'trigger-community',
			xhropt: {
				url: 'https://trigger-community.sundayschoolonline.org/unixtime.php',
				restype: 'json'
			},
			xhrthen: ({response, status}) => {
				if (status !== 200) throw `Unhandled Status (${status})`;
				let unix_ms = response.unixtime * 1000;
				return unix_ms;
			}
		},
		{
			name: 'CurrentTimestamp.com',
			xhropt: {
				url: 'http://currenttimestamp.com/'
			},
			xhrthen: ({response, status}) => {
				if (status !== 200) throw `Unhandled Status (${status})`;

				let extract = /current_time = (\d+);/.exec(response);
				if (!extract) throw 'Extraction Failed';

				let unix_ms = extract[1] * 1000;
				return unix_ms;
			}
		},
		{
			name: 'convert-unix-time.com',
			xhropt: {
				url: 'http://convert-unix-time.com/'
			},
			xhrthen: ({response, status}) => {
				if (status !== 200) throw `Unhandled Status (${status})`;

				let extract = /currentTimeLink.*?(\d{10,})/.exec(response);
				if (!extract) throw 'Extraction Failed';

				let unix_ms = extract[1] * 1000;
				return unix_ms;
			}
		}
	];

	let errors = [];
	for (let { xhropt, name, xhrthen } of servers) {
		try {
			let start = Date.now();
			let xpserver = await xhrPromise({ ...xhropt, timeout:opt.timeout });
			let duration = Date.now() - start;
			let halfduration = Math.round(duration / 2);

			let unix_ms = xhrthen(xpserver.xhr);

			if (opt.compensate) unix_ms -= halfduration;

			return unix_ms;
		} catch(ex) {
			if (typeof(ex) == 'string') ex = ex
			else if (ex && typeof(ex) == 'object' && ex.xhr && ex.reason) ex = 'XHR ' + ex.reason
			else ex = ex.toString();

			errors.push(`Server "${name}" Error: ` + ex);

			continue;
		}
	}

	throw errors;
}

function objectAssignDeep(target, source) {
  // rev3 - https://gist.github.com/Noitidart/dffcd2ace6135350cd0ca80f615e06dc
  var args       = Array.prototype.slice.call(arguments);
  var startIndex = 1;
  var output     = Object(target || {});

  // Cycle the source object arguments.
	for (var a = startIndex, alen = args.length ; a < alen ; a++) {
		var from = args[a];
		var keys = Object.keys(Object(from));

    // Cycle the properties.
		for (var k = 0; k < keys.length; k++) {
      var key = keys[k];

      // Merge arrays.
      if (Array.isArray(output[key]) || Array.isArray(from[key])) {
        var o = (Array.isArray(output[key]) ? output[key].slice() : []);
        var f = (Array.isArray(from[key])   ? from[key].slice()   : []);
        output[key] = o.concat(f);
      }

      // Copy functions references.
      else if (typeof(output[key]) == 'function' || typeof(from[key]) == 'function') {
        output[key] = from[key];
      }

      // Extend objects.
      else if ((output[key] && typeof(output[key]) == 'object') || (from[key] && typeof(from[key]) == 'object')) {
        output[key] = objectAssignDeep(output[key], from[key]);
      }

      // Copy all other types.
      else {
        output[key] = from[key];
      }

		}

	}

	return output;

};

class PromiseBasket {
	constructor() {
		this.promises = [];
		this.thens = [];
	}
	add(aAsync, onThen) {
		// onThen is optional
		this.promises.push(aAsync);
		this.thens.push(onThen);
	}
	async run() {
		let results = await Promise.all(this.promises);
		results.forEach((r, i)=>this.thens[i] ? this.thens[i](r) : null);
		return results;
	}
}

async function promiseTimeout(milliseconds) {
	await new Promise(resolve => setTimeout(()=>resolve(), milliseconds))
}

function pushAlternatingRepeating(aTargetArr, aEntry) {
	// pushes into an array aEntry, every alternating
		// so if aEntry 0
			// [1, 2] becomes [1, 0, 2]
			// [1] statys [1]
			// [1, 2, 3] becomes [1, 0, 2, 0, 3]
	let l = aTargetArr.length;
	for (let i=l-1; i>0; i--) {
		aTargetArr.splice(i, 0, aEntry);
	}

	return aTargetArr;
}

function Uint8ArrayToString(arr) {
  let MAX_ARGC = 65535;
  let len = arr.length;
  let s = "";
  for (let i = 0; i < len; i += MAX_ARGC) {
    if (i + MAX_ARGC > len) {
      s += String.fromCharCode.apply(null, arr.subarray(i));
    } else {
      s += String.fromCharCode.apply(null, arr.subarray(i, i + MAX_ARGC));
    }
  }
  return s;
}
