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

function deepAccessUsingString(obj, key){
	// https://medium.com/@chekofif/using-es6-s-proxy-for-safe-object-property-access-f42fa4380b2c#.xotsyhx8t
  return key.split('.').reduce((nestedObject, key) => {
    if(nestedObject && key in nestedObject) {
      return nestedObject[key];
    }
    return undefined;
  }, obj);
}

async function doRetries(retry_ms, retry_cnt, callback) {
	// callback should return promise
	// total_time = retry_ms * retry_cnt
	for (let i=0; i<retry_cnt; i++) {
		try {
			return await callback();
		} catch(err) {
			console.warn('retry err:', err, 'attempt, i:', i);
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
