/**
Version 0.0.2, 
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

if (process.argv.length < 3) {
	console.log('node ' + __filename + ' <port number> [<password>]');
	process.exit(1);
}
var port = process.argv[2];
var pass = process.argv.length > 3 ? process.argv[3] : false;
var baseUrl = 'http://localhost:' + port + '/';
//var baseUrl = 'http://node.cs.ucalgary.ca:' + port + '/';
// var imgFieldName = 'image';

var commands = [];

function getUrl() {
	var path = arguments[0] || '';
	var usePass = (arguments[1] === undefined ? true : arguments[1]);
	var url = baseUrl + path + (usePass ? '?password=' + q.escape(pass) : '');
	
	console.log('url = ' + url);
	
	return url;
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
			console.log(index + '. ' + commandName + ' body: ' + body);
		} else {
			console.log(index + '. ' + commandName + ' OK');
			console.log(index + '. ' + commandName + ' body: ' + body);
			
			var go_on = true;
			if (!(success === undefined)) {
				go_on = success(response, body);
			}
			
			if (go_on && index + 1 < commands.length) {
				runCommand(index + 1);
			}
		}
	}
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
}

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
		console.log('cookies = ' + util.inspect(cookies));
		
		var parts = cookies.split(';');
		for(var i = 0; i < parts.length; i++) {
			// console.log('parts[i]=' + parts[i]);
			var keyval = parts[i].trim().split('=');
			if (keyval[0].indexOf('sid') >= 0) {
				sid = parts[i].trim();
				console.log('sid = ' + sid);
				return true;
			}
		}
		
		console.log('cannot find sid in cookies, login failed');
		return false;
	}
});


commands.push({
	name: 'upload single photo',
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
			}
		};
		
		rest.post(getUrl('photos/create', false), options).on('complete', function(data, response) {
			var err = (response.statusCode >= 200 && response.statusCode < 300) ? false : 'status_code = ' + response.statusCode;
			handler(err, response, data);
		});
	}
});


commands.push({
	name: 'feed request',
	command: function(index, handler) {
		var options = {
			headers: {
				'Cookie': (sid + ';')
			}
		};
		
		rest.get(getUrl('feed', false), options).on('complete', function(data, response) {
			var err = (response.statusCode >= 200 && response.statusCode < 300) ? false : 'status_code = ' + response.statusCode;
			handler(err, response, data);
		});
	}
});

runCommand(0);
