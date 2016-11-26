// scope: requires dom
// i consider XMLHttpRequest apart of the dom

// rev2 - https://gist.github.com/Noitidart/59ee6c306fa493a4f35fb122bcf13e99
function getBrowser() {
	function getBrowserInner() {
		// http://stackoverflow.com/a/2401861/1828637
	    var ua= navigator.userAgent, tem,
	    M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
	    if(/trident/i.test(M[1])){
	        tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
	        return 'IE '+(tem[1] || '');
	    }
	    if(M[1]=== 'Chrome'){
	        tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
	        if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
	    }
	    M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
	    if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
	    return M.join(' ');
	}

	var name_version_str = getBrowserInner();
	var split = name_version_str.split(' ');
	var version = split.pop();
	var name = split.join(' ');
	return {
		name: name,
		version: version
	};
}

function queryStringDom(objstr, opts={}) {
	// queryString using DOM capabilities, like `new URL`

	// objstr can be obj or str
	// if obj then it does stringify
	// if str then it does parse. if str it should be a url

	if (typeof(objstr) == 'string') {
		// parse
		// is a url?
		let url;
		try {
			url = new URL(objstr);
		} catch(ignore) {}

		// if (url) objstr = objstr.substr(url.search(/[\?\#]/));
		//
		// if (objstr.startsWith('?')) objstr = objstr.substr(1);
		// if (objstr.startsWith('#')) objstr = objstr.substr(1);

		if (!url) throw new Error('Non-url not yet supported');

		let ret = {};

		let strs = [];
		if (url.search) strs.push(url.search);
		if (url.hash) strs.push(url.hash);
		if (!strs.length) throw new Error('no search or hash on this url! ' + objstr);

		strs.forEach(str => {
			// taken from queryString 4.2.3 - https://github.com/sindresorhus/query-string/blob/3ba022410dbcff27404de090b33ce9b67768c139/index.js
			str = str.trim().replace(/^(\?|#|&)/, '');
			str.split('&').forEach(function (param) {
				var parts = param.replace(/\+/g, ' ').split('=');
				// Firefox (pre 40) decodes `%3D` to `=`
				// https://github.com/sindresorhus/query-string/pull/37
				var key = parts.shift();
				var val = parts.length > 0 ? parts.join('=') : undefined;

				key = decodeURIComponent(key);

				// missing `=` should be `null`:
				// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
				val = val === undefined ? null : decodeURIComponent(val);

				if (ret[key] === undefined) {
					ret[key] = val;
				} else if (Array.isArray(ret[key])) {
					ret[key].push(val);
				} else {
					ret[key] = [ret[key], val];
				}
			});
		});

		return ret;
	} else {
		// stringify
		// taken from queryString github release 4.2.3 but modified out the objectAssign for Object.assign and anded encode as strict-uri-encode - https://github.com/sindresorhus/query-string/blob/3ba022410dbcff27404de090b33ce9b67768c139/index.js
		let objectAssign = Object.assign;
		let encode = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);
		let obj = objstr;
		// strict-uri-encode taken from - github release 2.0.0 - https://github.com/kevva/strict-uri-encode/blob/0b2dfae92f37618e1cb5f15911bb717e45b71385/index.js

		// below
		var defaults = {
			encode: true,
			strict: true
		};

		opts = objectAssign(defaults, opts);

		return obj ? Object.keys(obj).sort().map(function (key) {
			var val = obj[key];

			if (val === undefined) {
				return '';
			}

			if (val === null) {
				return encode(key, opts);
			}

			if (Array.isArray(val)) {
				var result = [];

				val.slice().forEach(function (val2) {
					if (val2 === undefined) {
						return;
					}

					if (val2 === null) {
						result.push(encode(key, opts));
					} else {
						result.push(encode(key, opts) + '=' + encode(val2, opts));
					}
				});

				return result.join('&');
			}

			return encode(key, opts) + '=' + encode(val, opts);
		}).filter(function (x) {
			return x.length > 0;
		}).join('&') : '';
	}
}

function stopClickAndCheck0(e) {
	if (!e) return true;

	e.stopPropagation();
	e.preventDefault();

	return e.button === 0 ? true : false;
}

function xhrPromise(url, opt={}) {

	// three ways to call
		// xhrPromise( {url, ...} )
		// xhrPromise(url, {...})
		// xhrPromise(undefined/null, {...})

	if (typeof(url) == 'object' && url && url.constructor.name == 'Object') opt = url;

	// set default options
	opt = {
		restype: 'text',
		method: 'GET',
		data: undefined,
		headers: {},
		timeout: 0, // integer, milliseconds, 0 means never timeout, value is in milliseconds
		onprogress: undefined, // set to callback you want called
		onuploadprogress: undefined, // set to callback you want called
		// odd options
		reject: true,
		fdhdr: false, // stands for "Form Data Header" set to true if you want it to add Content-Type application/x-www-form-urlencoded
		// overwrite with what devuser specified
		...opt
	};
	if (opt.url) url = opt.url;

	return new Promise( (resolve, reject) => {
		let xhr = new XMLHttpRequest();

		if (opt.timeout) xhr.timeout = opt.timout;

		let evf = f => ['load', 'error', 'abort', 'timeout'].forEach(f);

		let handler = ev => {
			evf(m => xhr.removeEventListener(m, handler, false));
		    switch (ev.type) {
		        case 'load':
		            	resolve({ xhr, reason:ev.type });
		            break;
		        case 'abort':
		        case 'error':
		        case 'timeout':
						console.error('ev:', ev);
						if (opt.reject) reject({ xhr, reason:ev.type });
						else resolve({ xhr, reason:ev.type });
		            break;
		        default:
					if (opt.reject) reject({ xhr, reason:'unknown', type:ev.type });
					else resolve({ xhr, reason:'unknown', type:ev.type });
		    }
		};

		evf(m => xhr.addEventListener(m, handler, false));

		if (opt.onprogress) xhr.addEventListener('progress', opt.onprogress, false);
		if (opt.onuploadprogress) xhr.upload.addEventListener('progress', opt.onuploadprogress, false);

		xhr.open(opt.method, url, true);

		xhr.responseType = opt.restype;

		if (opt.fdhdr) opt.headers['Content-Type'] = 'application/x-www-form-urlencoded'
		for (let h in opt.headers) xhr.setRequestHeader(h, opt.headers[h]);

		if (typeof(opt.data) == 'object' && opt.data != null && opt.data.constructor.name == 'Object') opt.data = queryStringDom(opt.data);

		xhr.send(opt.data);
	});
}

function xhrSync(url, opt={}) {
	const optdefault = {
		// restype: 'text', // DOMException [InvalidAccessError: "synchronous XMLHttpRequests do not support timeout and responseType."
		method: 'GET'
	};
	opt = Object.assign(optdefault, opt);

	if (opt.url) url = url;

	let xhreq = new XMLHttpRequest();
	xhreq.open(opt.method, url, false);
	// xhreq.restype = opt.restype;
	xhreq.send();
}
