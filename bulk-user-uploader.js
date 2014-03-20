var http = require('http');
var str = JSON.stringify([
{id:1, name:'user1', follows:[2,3,4,5], password: 'user1'},
{id:2, name:'user2', follows:[3,4,5], password:'user2'},
{id:3, name:'user3', follows:[4,5], password:'user3'},
{id:4, name:'user4', follows:[5], password:'user4'},
{id:5, name:'user5', follows:[], password:'user5'}]);
var opts = {
	host: "node.cs.ucalgary.ca",
	path: "/bulk/users",
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
			console.log('Users Uploaded');
		});
	});
	request.on('error', function(err) {console.log(err);});
	request.write(str);
	request.end();
}

sendReq();
