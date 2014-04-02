/**
== Version 0.0.4 ==
- loads thumbnails

== Version 0.0.3 ==
- does not follow redirects anymore
- set debug=true to print the body of the responses to the output

== Version 0.0.2 ==
Thanks to "Gregory Caufield" for his suggestions.
bug fixes:
- The image field name in the upload form is changed from "imgFieldName" to "image".
- The content type of the uploaded image is set to "image/jpeg" now.
- Cookie is set correctly to "'Cookie': (sid + ';')".
*/

var request = require("request");
var fs = require('fs');
var path = require('path');
var http = require('http');
var q = require('querystring');
var rest = require('restler');
var util = require('util');

var debug = false;

if (process.argv.length < 3) {
	console.log('node ' + __filename + ' <port number> [<password>]');
	process.exit(1);
}

var port = process.argv[2];
var pass = process.argv.length > 3 ? process.argv[3] : false;
//var baseUrl = 'http://node.cs.ucalgary.ca:' + port + '/';
var baseUrl = 'http://localhost:' + port + '/';
var commands = [];

console.log(arguments[1]);
function getUrl() {
	var path = arguments[0] || '';
	var usePass = (typeof(arguments[1]) == 'undefined' ? true : arguments[1]);
	var url = baseUrl + path + (usePass ? '?password=' + q.escape(pass) : '');
	
	if (debug) {
		console.log('url = ' + url);
	}
	return url;
}

function loadThumbnails(urls) {
	function load(i, urls) {
		if (i >= urls.length)
			return;
		
		if (debug) {
			console.log('loading', i + 1, 'of', urls.length, 'thumbnails');
		}
		
		var req = http.get(getUrl(urls[i], false), function(res){
			res.on('data', function(data){
				// console.log(data);
			})
			
			res.on('end', function() {
				load(i + 1, urls);
			});

			res.on('error', function(e){
				console.log('error while loading ' + urls[i], e);
				throw e;
			});
			
			if (res.statusCode != 200)
				throw "Status code of " + urls[i] + " is " + res.statusCode;
		});
		
		req.on('error', function(e){
			console.log('error while loading ' + urls[i], e);
			throw e;
		});			
	}
	
	load(0, urls);
}

function runCommand(index) {
	var cmd = commands[index];
	console.log('----------------');
	console.log(index + ' running command "' + cmd.name + '"');
	cmd.command(index, createHandlerFor(cmd.name, index, cmd.success));
}

function createHandlerFor(commandName, index, success) {
	return function(error, response, body) {
		if (error) {
			console.log(index + '. ' + commandName + ' error: ' + error);
			if (debug) {
				console.log(index + '. ' + commandName + ' body: ' + body);
			}			
		} else {
			console.log(index + '. ' + commandName + ' OK');
			if (debug) {
				console.log(index + '. ' + commandName + ' body: ' + body);
			}
			
			var go_on = true;
			if (typeof(success) != 'undefined') {
				go_on = success(response, body);
			}
			
			if (go_on && index + 1 < commands.length) {
				runCommand(index + 1);
			}
		}
	}
}

function findAllThumbnails(body) {
	var re = /src\s?=\s?('|")\/?(photos\/thumbnail\/[^'">]+)/gi;
	var match;
	var links = [];
	while(match = re.exec(body)) {
		links.push(match[2]);
	}
	
	return links;
}

if (pass) { // if password is give, do the bulk operations
	commands.push({
		name: 'clear db',
		command: function(index, handler) {
			request({
				uri : getUrl('bulk/clear'),
				method : "GET",
			}, handler);
		}
	});

	commands.push({
		name: 'bulk upload users',
		command: function(index, handler) {
			fs.createReadStream('users.json').pipe(request.post({
				url : getUrl('bulk/users')
			}, handler));
		}
	});

	commands.push({
		name: 'bulk upload photos',
		command: function(index, handler) {
			fs.createReadStream('photos.json').pipe(request.post({
				url : getUrl('bulk/streams')
			}, handler));
		}
	});
} // end of bulk operations

var sid = 'sid=--sid--';

commands.push({
	name: 'login',
	command: function(index, handler) {
		request({
			uri : getUrl('sessions/create', false),
			method : "POST",
			form : {
				username : "sukhpreet",
				password : "Sukhpreet"
			}
		}, handler);
	},
	success: function(response, body) {
		var cookies = response.headers['set-cookie'].toString();
		if (debug) {
			console.log('cookies = ' + util.inspect(cookies));
		}
		
		var parts = cookies.split(';');
		for(var i = 0; i < parts.length; i++) {
			// console.log('parts[i]=' + parts[i]);
			var keyval = parts[i].trim().split('=');
			if (keyval[0].indexOf('sid') >= 0) {
				sid = parts[i].trim();
				console.log(sid);
				return true;
			}
		}
		
		console.log('cannot find sid in cookies, login failed');
		return false;
	}
});


commands.push({
	name: 'upload single photo',
	concurrent: 50,
	command: function(index, handler) {
		var filePath = path.join(__dirname, '2.jpg');
		var stats = fs.statSync(filePath);
		var size = stats['size'];
		
		var options = {
			multipart: true,
			headers: {
				'Cookie': (sid + ';')
			},
			data: {
				'image': rest.file(filePath, null, size, null, 'image/jpeg')
			},
			followRedirects: false
		};
		
		rest.post(getUrl('photos/create', false), options).on('complete', function(data, response) {
			// console.log(util.inspect(response));
			var err = (response.statusCode >= 200 && response.statusCode < 310) ? false : 'status_code = ' + response.statusCode;
			handler(err, response, data);
		});
	}
});


commands.push({
	name: 'feed request',
	concurrent: 50,
	command: function(index, handler) {
		var options = {
			headers: {
				'Cookie': (sid + ';')
			},
			followRedirects: false
		};
		
		rest.get(getUrl('feed', false), options).on('complete', function(data, response) {
			var err = (response.statusCode >= 200 && response.statusCode < 310) ? false : 'status_code = ' + response.statusCode;
			handler(err, response, data);
			var thumbnails = findAllThumbnails(data);
			console.log('Thumbnails (' + thumbnails.length + '): \n', thumbnails);
			loadThumbnails(thumbnails);
		});
	}
});

runCommand(0);
