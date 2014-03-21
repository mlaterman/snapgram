var http = require('http');
var str = JSON.stringify([
{id:1, user_id:1, path: './photos/1.png', timestamp:1395439597730},
{id:2, user_id:1, path: './photos/2.jpg', timestamp:1395439597731},
{id:3, user_id:2, path: './photos/1.png', timestamp:1395439597732}]);
var opts = {
	host: "node.cs.ucalgary.ca",
	path: "/bulk/streams?password=thunder",
	port: 8500,
	method: "POST",
	headers:{'Content-Type' : 'application/json',
			 'Content-Length' : str.length}
}

function sendReq() {
	var request = http.request(opts);
	request.on('response', function(res) {
		res.on('data', function(chunk) {});
		res.on('end', function() {
			console.log('Streams Uploaded');
		});
	});
	request.on('error', function(err) {console.log(err);});
	request.write(str);
	request.end();
}

sendReq();
