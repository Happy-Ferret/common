// scope: bootstrap.js of firefox addons
// required imports:
	// Cu.import('resource://gre/modules/Timer.jsm');
	// Cu.import('resource://gre/modules/osfile.jsm');

function getNativeHandlePtrStr(aDOMWindow) {
	let aDOMBaseWindow = aDOMWindow.QueryInterface(Ci.nsIInterfaceRequestor)
								   .getInterface(Ci.nsIWebNavigation)
								   .QueryInterface(Ci.nsIDocShellTreeItem)
								   .treeOwner
								   .QueryInterface(Ci.nsIInterfaceRequestor)
								   .getInterface(Ci.nsIBaseWindow);
	return aDOMBaseWindow.nativeHandle;
}

let gRequirers = {};
let gRequireds = {};
function lazyRequire(type, path, exportedas) {
	// exportedas - string - what it is exported as
	// type - string;enum[sdk,dev]
	// path - string - path to require
	// examples:
		// lazyRequire('sdk/l10n/locale').getPreferedLocales();
		// lazyRequire('dev', 'devtools/shared/jsbeautify/src/beautify-js', 'jsBeautify')(javascript_text)
	let required = gRequireds[path];
	if (!required) {
		let requirer = gRequirers[type];
		if (!requirer) {
			if (type == 'dev')
				({ require:requirer } = Cu.import('resource://devtools/shared/Loader.jsm', {}));
			else if (type == 'sdk')
				({ require:requirer } = Cu.import('resource://gre/modules/commonjs/toolkit/require.js', {}));

			gRequirers[type] = requirer;
		}

		if (exportedas)
			({ [exportedas]:required } = requirer(path));
		else
			required = requirer(path);


		gRequireds[path] = required;
	}

	return required;
}

// TODO: not yet comitted - rev3 - https://gist.github.com/Noitidart/5257376b54935556173e8d13c2821f4e
async function writeThenDirMT(path, contents, from, opt={}) {
	// path - platform path of file to write
	// from - platform path of dir to make from
	// contents -
	// opt - see `optd`

	// tries to writeAtomic
	// if it fails due to dirs not existing, it creates the dir
	// then writes again
	// if fail again for whatever reason it rejects with `osfileerr`
	// on success resolves with `undefined`

	let optd = {
		encoding: 'utf-8',
		noOverwrite: false
		// tmpPath: path + '.tmp'
	};

	opt = Object.assign(optd, opt);

	let writeTarget = () => OS.File.writeAtomic(path, contents, opt);

	try {
		await writeTarget();
	} catch(osfileerr) {
		if (osfileerr.becauseNoSuchFile) { // this happens when directories dont exist to it
			// TODO: verify this again: // im pretty sure i tested, if contents was a Uint8Array it will not be netuered. it is only neutered on success.
			await OS.File.makeDir(OS.Path.dirname(path), {from}); // can throw
			await writeTarget(); // can throw
		} else {
			throw osfileerr;
		}
	}
}

function xhrSync(url, opt={}) {
	const optdefault = {
		responseType: 'text',
		method: 'GET'
	};
	opt = Object.assign(optdefault, opt);

	if (opt.url) url = url;

	let xhreq = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance(Ci.nsIXMLHttpRequest);
	xhreq.open(opt.method, url, false);
	xhreq.responseType = opt.responseType;
	xhreq.send();

	return xhreq;
}

function getXPrefs(aArgs) {
	let { nametypes } = aArgs;
	let rez = {};

	// namevals should be object { [pref_string]:[pref_type]}
		// pref_type is string - string, bool, int
	// Services.prefs.PREF_STRING 32
	// Services.prefs.PREF_BOOL 128
	// Services.prefs.PREF_INT 64
	// Services.prefs.PREF_INVALID 0

	console.log('bootstrap getting namevals:', namevals);

	var getXTypeFromType = aPrefType => {
		switch (aPrefType.toLowerCase()) {
			case 'string':
				return 'Char';
			case 'number':
				return 'Int';
			case 'boolean':
				return 'Bool';
			default:
				throw new Error('invalid value for pref_type: "' + aPrefType + '"');
		}
	};

	for (let name in nametypes) {
		let type = namevals[name];
		try {
			rez[name] = Services.prefs['get' + getXTypeFromType(type) + 'Pref'](name);
		} catch(ex) {
			// pref doesnt exist
			// console.error('ex during getXXXPref, ex:', ex);
			rez[name] = null;
		}
	}

	return rez;
}

function setXPrefs(aArgs) {
	let { namevals } = aArgs;
	// namevals should be object { [pref_string]:pref_value }
		// pref_value of null means reset it

	var getXTypeFromValue = aPrefValue => {
		switch (typeof(aPrefValue)) {
			case 'string':
				return 'Char';
			case 'number':
				return 'Int';
			case 'boolean':
				return 'Bool';
			default:
				throw new Error('invalid type for aPrefValue, you probably want a string type!');
		}
	};

	for (let name in namevals) {
		let val = namevals[name];
		if (val === null) {
			Services.prefs['clearUserPref'](name);
		} else {
			Services.prefs['set' + getXTypeFromValue(val) + 'Pref'](name, val);
		}
	}
}

function setApplyBackgroundUpdates(aNewApplyBackgroundUpdates) {
	// 0 - off, 1 - respect global setting, 2 - on
	AddonManager.getAddonByID(SELFID, addon =>
		addon.applyBackgroundUpdates = aNewApplyBackgroundUpdates
	);
}

async function getAddonInfo(aAddonId=SELFID) {
	return await new Promise(resolve =>
		AddonManager.getAddonByID(aAddonId, addon =>
			resolve({
				applyBackgroundUpdates: parseInt(addon.applyBackgroundUpdates) === 1 ? (AddonManager.autoUpdateDefault ? 2 : 0) : parseInt(addon.applyBackgroundUpdates),
				updateDate: addon.updateDate.getTime()
			})
		)
	);
}
