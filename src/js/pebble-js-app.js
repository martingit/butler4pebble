var initialized = false;
var options = {
	server: '',
	port: 8081,
	usehttps: false,
  useauth: false,
  username: '',
  password: ''
};
var devices = {};
var configurationUrl = 'https://dl.dropboxusercontent.com/u/6839132/configurable.html?v=1.0';


var Base64 = {

  // private property
  _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  
  // public method for encoding
  encode : function (input) {
      var output = "";
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      var i = 0;
  
      input = Base64._utf8_encode(input);
  
      while (i < input.length) {
  
          chr1 = input.charCodeAt(i++);
          chr2 = input.charCodeAt(i++);
          chr3 = input.charCodeAt(i++);
  
          enc1 = chr1 >> 2;
          enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
          enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
          enc4 = chr3 & 63;
  
          if (isNaN(chr2)) {
              enc3 = enc4 = 64;
          } else if (isNaN(chr3)) {
              enc4 = 64;
          }
  
          output = output +
          this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
          this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
  
      }
  
      return output;
  },
  
  // public method for decoding
  decode : function (input) {
      var output = "";
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i = 0;
  
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
  
      while (i < input.length) {
  
          enc1 = this._keyStr.indexOf(input.charAt(i++));
          enc2 = this._keyStr.indexOf(input.charAt(i++));
          enc3 = this._keyStr.indexOf(input.charAt(i++));
          enc4 = this._keyStr.indexOf(input.charAt(i++));
  
          chr1 = (enc1 << 2) | (enc2 >> 4);
          chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          chr3 = ((enc3 & 3) << 6) | enc4;
  
          output = output + String.fromCharCode(chr1);
  
          if (enc3 != 64) {
              output = output + String.fromCharCode(chr2);
          }
          if (enc4 != 64) {
              output = output + String.fromCharCode(chr3);
          }
  
      }
  
      output = Base64._utf8_decode(output);
  
      return output;
  
  },
  
  // private method for UTF-8 encoding
  _utf8_encode : function (string) {
      string = string.replace(/\r\n/g,"\n");
      var utftext = "";
  
      for (var n = 0; n < string.length; n++) {
  
          var c = string.charCodeAt(n);
  
          if (c < 128) {
              utftext += String.fromCharCode(c);
          }
          else if((c > 127) && (c < 2048)) {
              utftext += String.fromCharCode((c >> 6) | 192);
              utftext += String.fromCharCode((c & 63) | 128);
          }
          else {
              utftext += String.fromCharCode((c >> 12) | 224);
              utftext += String.fromCharCode(((c >> 6) & 63) | 128);
              utftext += String.fromCharCode((c & 63) | 128);
          }
  
      }
  
      return utftext;
  },
  
  // private method for UTF-8 decoding
  _utf8_decode : function (utftext) {
      var string = "";
      var i = 0;
      var c = c1 = c2 = 0;
  
      while ( i < utftext.length ) {
  
          c = utftext.charCodeAt(i);
  
          if (c < 128) {
              string += String.fromCharCode(c);
              i++;
          }
          else if((c > 191) && (c < 224)) {
              c2 = utftext.charCodeAt(i+1);
              string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
              i += 2;
          }
          else {
              c2 = utftext.charCodeAt(i+1);
              c3 = utftext.charCodeAt(i+2);
              string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
              i += 3;
          }
      }
      return string;
  }
};

var pebbleSendQueue = {
	queue: [],
	queueFull: false,
	send: function(msg) {
		if (this.queueFull) {
			this.queue.push(msg);
			return;
		}
		this.queueFull = true;
		this._doSend(msg);
	},
	_sendDone: function(e) {
		if (this.queue.length === 0) {
			this.queueFull = false;
			return;
		}
		var msg = pebbleSendQueue.queue.splice(0,1)[0];
		this._doSend(msg);
	},
	_sendFailed: function(e) {
		var msg = pebbleSendQueue.queue.splice(0,1)[0];
		this._doSend(msg);
	},
	_doSend: function(msg) {
		Pebble.sendAppMessage(msg, function(e) { pebbleSendQueue._sendDone(e); }, function(e) { pebbleSendQueue._sendFailed(e); });
	}
};
function loadConfiguration(){
  var server = window.localStorage.getItem('server');
  console.log('server: ' + server);
  if (server && server !== undefined && server !== null && server !== 'undefined'){
    options.server = server;
  } else {
    options.server = '';
  }
  
  var port = parseInt(window.localStorage.getItem('port'));
  console.log('port: ' + port);
  if (!isNaN(port) && port > 0){
    options.port = port;
  } else {
    options.port = 8081;
  }
  var usehttps = window.localStorage.getItem('usehttps');
  console.log('usehttps: ' + usehttps);
  options.usehttps = usehttps == 'true';

  var useauth = window.localStorage.getItem('useauth');
  console.log('useauth: ' + useauth);
  options.useauth = useauth == 'true';

  var username = window.localStorage.getItem('username');
  console.log('username: ' + username);
  if (username && username !== undefined && username !== null && username !== 'undefined'){
    options.username = username;
  } else {
    options.username = '';
  }

  var password = window.localStorage.getItem('password');
  console.log('password: ' + password);
  if (password && password !== undefined && password !== null && password !== 'undefined'){
    options.password = password;
  } else {
    options.password = '';
  }

  console.log('loaded settings: ' + JSON.stringify(options));
}
function saveConfiguration(){
	window.localStorage.setItem('server', options.server);
  window.localStorage.setItem('port', options.port);
  window.localStorage.setItem('usehttps', options.usehttps);
  window.localStorage.setItem('useauth', options.useauth);
  window.localStorage.setItem('username', options.username);
  window.localStorage.setItem('password', options.password);
  console.log('saving settings: ' + JSON.stringify(options));
}
function getBaseUrl(){
	return 'http' + (options.usehttps === 'true' ? 's' : '') + '://' + options.server + ':' + options.port + '/';
}

function getXmlHttpRequest(method, url){
  var req = new XMLHttpRequest();
  req.open(method, url, true);
  req.setRequestHeader('Content-Type', 'application/json; charset=utf8');
  if (options.useauth){
    req.setRequestHeader("Authorization", "Basic " + Base64.encode(options.username + ":" + options.password)); 
  }
  req.timeout = 5000;
  req.ontimeout = function(e){
    console.log("Request timed out..." + JSON.stringify(e));
    pebbleSendQueue.send({
      AKEY_MODULE: "error",
      AKEY_ACTION: "connection"
    });
  };
  req.onerror = function(e){
    console.log("An unexpected error occured. " + JSON.stringify(e));
    pebbleSendQueue.send({
      AKEY_MODULE: "error",
      AKEY_ACTION: "connection"
    });
  };
  return req;
}

function getDevices() {
	if (options.server === '' || options.server === undefined || options.server === null || !options.server){
		console.log('exiting...');
		return;
	}
	var baseUrl = getBaseUrl();
  console.log('baseUrl = ' + baseUrl);
  var response;
  var req = getXmlHttpRequest('GET', baseUrl + "device");
  req.onload = function(e) {
    if (req.readyState == 4) {
      // 200 - HTTP OK
      if(req.status == 200) {
        console.log('Got response: ' + req.responseText);
        response = JSON.parse(req.responseText);

        if (response.devices) {
          devices = response.devices;
          for(var i in devices) {
            var name = decodeURIComponent(unescape(unescape(devices[i].name)));
            if (name.length > 16) {
              name = name.substr(0,16);
            }
            console.log(JSON.stringify(devices[i]));
            pebbleSendQueue.send({
              AKEY_MODULE: "device",
              AKEY_ACTION: "info",
              AKEY_NAME: name,
              AKEY_ID: devices[i].id,
              AKEY_STATUS: devices[i].status ? 1 : 0
            });
          }
        }
      } else {
        console.log("Request returned error code " + req.status.toString());
        pebbleSendQueue.send({
          AKEY_MODULE: "error",
          AKEY_ACTION: "connection"
        });
      }
      return;
    }
    console.log(JSON.stringify(e));
  };
  req.send(null);
  console.log('request sent');
}
function updateDevice(deviceId, status) {
	var baseUrl = getBaseUrl();
  var response;
  
  var req = getXmlHttpRequest('POST', baseUrl + "device");
  req.onload = function(e) {
    if (req.readyState == 4) {
      // 200 - HTTP OK
      if(req.status == 200) {
        console.log(req.responseText);
        response = JSON.parse(req.responseText);
        pebbleSendQueue.send({
          AKEY_MODULE: "device",
          AKEY_ACTION: "select",
          AKEY_ID: parseInt(response.id),
          AKEY_STATUS: response.status ? 1 : 0
        });
      }
      else {
        console.log("Request returned error code " + req.status.toString());
        pebbleSendQueue.send({
          AKEY_MODULE: "error",
          AKEY_ACTION: "connection"
        });
      }
    }
  };
  req.send(JSON.stringify({'deviceId': deviceId, 'status': status}));
}
// Set callback for the app ready event
Pebble.addEventListener("ready", function(e) {
  console.log("PebbleKit JS up and running!");
  loadConfiguration();
  initialized = true;
  getDevices();
});

Pebble.addEventListener("appmessage", function(e) {
  var msg = e.payload;
  console.log(JSON.stringify(msg));
  if (!('AKEY_MODULE' in msg) || !('AKEY_ACTION' in msg)) {
    console.log('invalid appmessage');
    return;
  }
  if (msg.AKEY_MODULE == 'device') {
    if (msg.AKEY_ACTION == 'select') {
      var id = msg.AKEY_ID;
      console.log('Select device:'  + id);
      for(var i = 0; i < devices.length; i++){
        if (devices[i].id == id){
          var status = msg.AKEY_STATUS === 1 ? true : false;
          console.log('Selecting device: ' + devices[i].name + ", status: " + status);
          updateDevice(id, status);
          devices[i].status = status;
          return;
        }
      }
      console.log('device not found');
    }
    else if (msg.action == 'reload'){
      getDevices();
    }
  } 
});

Pebble.addEventListener("showConfiguration", function() {
  console.log("showing configuration");
  var url = configurationUrl;
	
  for(var i = 0, x = window.localStorage.length; i < x; i++) {
		var key = window.localStorage.key(i);
		var val = window.localStorage.getItem(key);
		if(val !== null) {
			url += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(val);
		}
	}
	console.log(url);
	Pebble.openURL(url);
});

Pebble.addEventListener("webviewclosed", function(e) {
  console.log("configuration closed");
  // webview closed
	if (e.response){
		var incomingOptions = JSON.parse(decodeURIComponent(e.response));
		console.log("Options = " + JSON.stringify(incomingOptions));
		options.server = incomingOptions.server;
		options.port = parseInt(incomingOptions.port);
		options.usehttps = incomingOptions.usehttps == "true";
		options.useauth = incomingOptions.useauth == "true";
		options.username = incomingOptions.username;
    options.password = incomingOptions.password;
    saveConfiguration();
		getDevices();
	}
});