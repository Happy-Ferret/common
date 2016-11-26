//scope: webextension background.js
// rev3 - not yet comit - https://gist.github.com/Noitidart/bcb964207ac370d3301720f3d5c9eb2b
var _storagecall_pendingset = {};
var _storagecall_callid = 1;
function storageCall(aArea, aAction, aKeys, aOptions) {
	if (typeof(aArea) == 'object') ({ aArea, aAction, aKeys, aOptions } = aArea);
	// because storage can fail, i created this, which goes until it doesnt fail

	// aAction - string;enum[set,get,clear,remove]
	// aKeys -
		// if aAction "clear" then ignore
		// if aAction "remove" then string/string[]
		// if aAction "get" then null/string/string[]
		// if aAction "set" then object
	// aOptions - object
		// maxtries - int;default:0 - set to 0 if you want it to try infinitely
		// timebetween - int;default:50 - milliseconds

	aOptions = aOptions ? aOptions : {};
	const maxtries = aOptions.maxtries || 0;
	const timebetween = aOptions.timebetween || 50;

	const callid = _storagecall_callid++; // the id of this call to `storageCall` // only used for when `aAction` is "set"

	if (aAction == 'set') {
		// see if still trying to set any of these keys
		for (var setkey in aKeys) {
			_storagecall_pendingset[setkey] = callid;
		}
	}
	return new Promise(function(resolve, reject) {
		// start asnc-proc49399
		var trycnt = 0;

		var call = function() {
			switch (aAction) {
				case 'clear':
						chrome.storage[aArea][aAction](check);
					break;
				case 'set':
						// special processing
						// start - block-link3191
						// make sure that each this `callid` is still responsible for setting in `aKeys`
						for (var setkey in aKeys) {
							if (_storagecall_pendingset[setkey] !== callid) {
								delete aKeys[setkey];
							}
						}
						// end - block-link3191
						if (!Object.keys(aKeys).length) resolve(); // no longer responsible, as another call to set - with the keys that this callid was responsible for - has been made, so lets say it succeeded // i `resolve` and not `reject` because, say i was still responsible for one of the keys, when that completes it will `resolve`
						else chrome.storage[aArea][aAction](aKeys, check);
					break;
				default:
					chrome.storage[aArea][aAction](aKeys, check);
			}
		};

		var check = function(arg1) {
			if (chrome.runtime.lastError) {
				if (!maxtries || trycnt++ < maxtries) setTimeout(call, timebetween);
				else reject(chrome.runtime.lastError); // `maxtries` reached
			} else {
				switch (aAction) {
					case 'clear':
					case 'remove':
							// callback `check` triggred with no arguments
							resolve();
					case 'set':
							// callback `check` triggred with no arguments - BUT special processing

							// race condition I THINK - because i think setting storage internals is async - so what if another call came in and did the set while this one was in between `call` and `check`, so meaningi t was processing - and then this finished processing AFTER a new call to `storageCall('', 'set'` happend
							// copy - block-link3191
							// make sure that each this `callid` is still responsible for setting in `aKeys`
							for (var setkey in aKeys) {
								if (_storagecall_pendingset[setkey] !== callid) {
									delete aKeys[setkey];
								}
							}
							// end copy - block-link3191

							// remove keys from `_storagecall_pendingset`
							for (var setkey in aKeys) {
								// assuming _storagecall_pendingset[setkey] === callid
								delete _storagecall_pendingset[setkey];
							}

							// SPECIAL - udpate nub.stg
							if (typeof(nub) == 'object' && nub.stg) {
								for (let setkey in aKeys) {
									if (setkey in nub.stg) nub.stg[setkey] = aKeys[setkey];
								}
							}

							resolve(aKeys);
						break;
					case 'get':
							// callback `check` triggred with 1 argument
							var stgeds = arg1;
							resolve(stgeds);
						break;
				}
				resolve(stgeds);
			}
		};

		call();
		// end asnc-proc49399
	});
}
