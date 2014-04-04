/**
== Version 0.1.0 ==
- concurrent requests added
- timing added
- sends sid cookie while loading thumbnails

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

const CMD_CLEAR_DB = 'Clear DB';
const CMD_BULK_USERS = 'Bulk upload users';
const CMD_BULK_PHOTOS = 'Bulk upload streams';
const CMD_LOGIN = 'Login';
const CMD_UPLOAD_SINGLE_PHOTO = 'Upload single photo';
const CMD_FEED_REQUEST = 'Feed request';

var request = require("request");
var fs = require('fs');
var path = require('path');
var http = require('http');
var q = require('querystring');
var rest = require('restler');
var util = require('util');
var async = require('async');

const debug = false;
const CONCURRENCY = 50;

if (process.argv.length < 3) {
	console.log('node ' + __filename + ' <port number> [<password>]');
	process.exit(1);
}
var port = process.argv[2];
var pass = process.argv.length > 3 ? process.argv[3] : false;
//var host = 'node.cs.ucalgary.ca';
var host = 'localhost';
var baseUrl = 'http://' + host + ':' + port + '/';
var commands = [];
var stats = [];
var sid = 'sid=--sid--';


function now() { // current time in milliseconds
	// var hrtime = process.hrtime();
	// return (hrtime[0] * 1000 + hrtime[1] / 1000);
	return new Date().getTime();
}

function StopWatch(taskName, index) {
	this.taskName = taskName;
	this.index = index;
	
	this.start = function(){ this.begin = now(); }
	this.stop = function(){ this.end = now(); }
	this.getDiff = function() {
		if (typeof(this.begin) == 'undefined')
			throw "start() not called on StopWatch: " + taskName + '[' + index + ']';
		
		if (typeof(this.end) == 'undefined')
			throw "stop() not called on StopWatch: " + taskName + '[' + index + ']';

		return this.end - this.begin; 
	}
}

function getUrl() {
	var path = arguments[0] || '';
	var usePass = (typeof(arguments[1]) == 'undefined' ? true : arguments[1]);
	var url = baseUrl + path + (usePass ? '?password=' + q.escape(pass) : '');
	
	if (debug) {
		console.log('url = ' + url);
	}
	return url;
}

function findAllThumbnails(body) {
	var re = /src\s?=\s?('|")(\/photos\/thumbnail\/[^'">]+)/gi;
	var match;
	var links = [];
	while(match = re.exec(body)) {
		links.push(match[2]);
	}
	
	return links;
}

function loadThumbnails(urls, onEnd) {
	function load(i, urls) {
		if (i >= urls.length) {
			onEnd();
			return;
		}
		
		if (debug) {
			console.log('loading', i + 1, 'of', urls.length, 'thumbnails');
		}
		
		var options = {
			hostname: host,
			port: port,
			path: urls[i],
			mathod: 'GET',
			headers: { 'Cookie': sid }
		};
		
		var req = http.request(options, function(res){
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
		
		req.end();
	}
	
	load(0, urls);
}

function runCommand(index) {
	var cmd = commands[index];
	console.log('----------------');
	console.log(index + ' running command "' + cmd.name + '"');

	var watchList = [];
	var concurrent = (typeof(cmd.concurrent) == 'undefined') ? 1 : cmd.concurrent;
	var running = concurrent;
	var succ = function(response, body, subtaskIndex) {
		watchList[subtaskIndex].stop();
		if((typeof(cmd.success) == 'undefined' || cmd.success(response, body)) && (--running) == 0) {
			
			stats.push({
				commandName: cmd.name,
				timings: watchList.map(function(w){ return w.getDiff(); })
			});
			
			if (index + 1 < commands.length) {
				runCommand(index + 1);
			} else {
				printStats();
			}
			
		}				
	}
	
	for (var i = 0; i < concurrent; i++) {
		var watch = new StopWatch(cmd.name, i);
		watchList.push(watch);
		watch.start();
		cmd.command(createHandlerFor(cmd.name, index, succ, i));
	}	
}

function createHandlerFor(commandName, index, success, subtaskIndex) {
	return function(error, response, body) {
		if (error) {
			console.log(index + '.' + subtaskIndex + '- ' + commandName + ' error: ' + error);
			if (debug) {
				console.log(index + '.' + subtaskIndex + '- ' + commandName + ' body: ' + body);
			}
			throw error;
		} else {
			console.log(index + '.' + subtaskIndex + '- ' + commandName + ' OK');
			if (debug) {
				console.log(index + '.' + subtaskIndex + '- ' + commandName + ' body: ' + body);
			}
			success(response, body, subtaskIndex);
		}
	}
}

function printStats() {
	if (debug) {
		console.log('----------');
		console.log(stats);
	}
	
	var pad = '                                              ';
	var n = 25;
	console.log('----------------------------------------------------------------------');
	console.log((pad + 'Task name').slice(-n), '\t', 'Min', '\t', 'Max', '\t', 'Average');
	console.log('----------------------------------------------------------------------');
	for(var i = 0; i < stats.length; i++) {
		var name = (pad + stats[i].commandName).slice(-n);
		var times = stats[i].timings;
		
		var min = Math.min.apply(null, times);
		var max = Math.max.apply(null, times);
		var avg = times.reduce(function(a, b) { return a + b; }) / times.length;
		
		console.log(name, '\t', min, '\t', max, '\t', avg);
	}
}

if (pass) { // if password is give, do the bulk operations
	commands.push({
		name: CMD_CLEAR_DB,
		command: function(handler) {
			request({
				uri : getUrl('bulk/clear'),
				method : "GET",
			}, handler);
		}
	});

	commands.push({
		name: CMD_BULK_USERS,
		command: function(handler) {
			fs.createReadStream('users.json').pipe(request.post({
				url : getUrl('bulk/users')
			}, handler));
		}
	});

	commands.push({
		name: CMD_BULK_PHOTOS,
		command: function(handler) {
			fs.createReadStream('photos.json').pipe(request.post({
				url : getUrl('bulk/streams')
			}, handler));
		}
	});
} // end of bulk operations


commands.push({
	name: CMD_LOGIN,
	command: function(handler) {
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
	name: CMD_UPLOAD_SINGLE_PHOTO,
	concurrent: CONCURRENCY,
	command: function(handler) {
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
	name: CMD_FEED_REQUEST,
	concurrent: CONCURRENCY,
	command: function(handler) {
		var options = {
			headers: {
				'Cookie': (sid + ';')
			},
			followRedirects: false
		};
		
		rest.get(getUrl('feed', false), options).on('complete', function(data, response) {
			var err = (response.statusCode >= 200 && response.statusCode < 310) ? false : 'status_code = ' + response.statusCode;
			var thumbnails = findAllThumbnails(data);
			if (debug) {
				console.log('Thumbnails (' + thumbnails.length + '): \n', thumbnails);
			}
			loadThumbnails(thumbnails, function(){ handler(err, response, data); });
		});
	}
});

runCommand(0);