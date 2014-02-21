var express = require('express');
var mysql = require('mysql');
var util = require('util');
var gm = require('gm');

var app = express();

app.get('/users/new', function(req, res) { //return user signup form

});

app.post('/users/create', function(req, res) { //create user from body info, logs in and redirects to feed
	
});

app.get('/users/:id/follow', function(req, res) {
	
});

app.get('/users/:id/unfollow', function(req, res) {
	
});

app.get('/users/:id', function(req, res) {
	
});

app.get('/sessions/new', function(req, res) { //return login form

});

app.post('/sessions/create', function(req, res) { //logs user in, redirects to /feed, if unsucessful, redirect to /sessions/new with error

});

app.get('/photos/new', function(req, res) {
	
});

app.post('/photos/create', function(req, res) {
	
});

app.get('/photos/thumbnail/:id.:ext', function(req, res) {
	
});

app.get('/photos/:id.:ext', function(req, res) {
	
});

app.get('/feed', function(req, res) {
	
});

/*
 * Admin Requirement Functions
 */
app.get('/bulk/clear', function(req, res) {
	
});

app.post('/bulk/users', function(req, res) {
	
});

app.post('/bulk/streams', function(req, res) {
	
});

/*
 * Homepage catch
 */
app.get('/', function(req, res) {
	if(loggedIn) {
		
	} else {
		
	}
});

app.get('*', function(req, res) { //unknown path
	respond404('Unknown Path', res);
});

function respond404(message, res) {
	util.log(message);
	res.writeHead(404);
	res.end(message);
}

function respond500(message, res) {
	util.log(message);
	res.writeHead(500);
	res.end(message);
}

app.listen(8080);
