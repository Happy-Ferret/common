//scope: webextension background.js
// REbrowser.*** instead of chrome.***
// collection requirements:
// global `nub.stg = {}`
// _locales/[LOCALE_TAG]/ directories
// all.js - findClosestLocale
// messages.json in _locales/** directories

// REQUIREMENTS:
// all.js - dedupeCaseInsensitive
async function getUserPreferredLocales() {
  // returns an array with the locales of the user. first entry is most highly preferred. after that is less
  let userlocale_preferred = browser.i18n.getUILanguage(); // same as `browser.i18n.getMessage('@@ui_locale')`
  let userlocale_lesspreferred = await browser.i18n.getAcceptLanguages();

  let userlocales = [userlocale_preferred, ...userlocale_lesspreferred];

  // remove duplicates, case insensitively
  return dedupeCaseInsensitive(userlocales);
}

// REQUIREMENTS:
// all.js - findClosestLocale
async function getClosestAvailableLocale() {
	// gets the locale available in my extension, that is closest to the users locale
	// returns null if nothing close

	// lower case things because thats what findClosestLocale needs
	let extlocales = await getExtLocales(); // these are the available locales
  let userlocales = await getUserPreferredLocales();

	let available = extlocales;
	let wanted = userlocales.map(el => el.toLowerCase()); // findClosestLocale needs it lower case

	return findClosestLocale(available, wanted); // returns `null` if not found
}

// REQUIREMENTS:
// _locales/[LOCALE_TAG]/ directories
async function getExtLocales() {
	let { xhr:{response} } = await xhrPromise('_locales/');

	let locales = [];
	let match, patt = /^.*? ([a-z\-]+)\//img;
	while (match = patt.exec(response))
		locales.push(match[1]);

	return locales;
}

// REQUIREMENTS
// messages.json in _locales/** directories
async function getSelectedLocale(testkey) {
	// returns the locale in my extension, that is being used by the browser, to display my extension stuff
	// testkey - string of key common to all messages.json files - will collect this message from each of the extlocales, then see what browser.i18n.getMessage(testkey) is equal to
	// REQUIRED: pick a `testkey` that has a unique value in each message.json file
	let extlocales = await getExtLocales();

	let errors = [];
	let msgs = {}; // localized_messages `[messages.json[testkey]]: extlocale`
	for (let extlocale of extlocales) {
		let msg = (await xhrPromise('_locales/' + extlocale + '/messages.json', { restype:'json' })).xhr.response[testkey].message;
    
		if (msg in msgs) errors.push(`* messages.json for locale "${extlocale}" has the same "message" as locale ${msgs[msg]} for \`testkey\`("${testkey}")`);
		else msgs[msg] = extlocale;
	}

	if (errors.length) throw 'ERROR(getSelectedLocale):\n' + errors.join('\n');

	return msgs[browser.i18n.getMessage(testkey)];
}

// rev3 - not yet comit - https://gist.github.com/Noitidart/bcb964207ac370d3301720f3d5c9eb2b
// REQUIREMENTS:
// global `nub.stg = {}`
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
