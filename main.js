var express = require('express');
var mysql = require('mysql');
var util = require('util');
var gm = require('gm');

var app = express();
app.use(express.cookieParser('s3cr3tk3y'));
app.use(express.session()); //use session or cookieSession?
/*
 * Session variables:
 * valid - end user is logged in
 * lError - login/create account error occured
 */
 
 var pDir = './photos/'; //base path to image directory

/*
 * Requests needed for basic functionality
 */
app.get('/users/new', function(req, res) { //return user signup form
	if(req.session.lError == null) {
		//default response here
	} else {
		//there was an error in creating an account
	}
});

app.post('/users/create', function(req, res) { //create user from body info, logs in and redirects to feed
	var uname = req.body.username;
	var pass = req.body.password;
	//escape these values
	
	//make sql query
	
	if(querySuccess) {
		req.session.valid = true;
		req.session.lError = null;
		res.redirect('/feed');
	} else {
		req.session.lError = true;
		res.redirect('/users/new');
	}
	res.send();
});

app.get('/users/:id/follow', function(req, res) {
	var id = req.params.id;
	
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		//follow user here
		//update follows table
	}
});

app.get('/users/:id/unfollow', function(req, res) {
	var id = req.params.id;
	
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		//unfollow user here
		//update follows table
	}
});

app.get('/users/:id', function(req, res) {
	var id = req.params.id;
	//deal with query string
	
	//make user feed
});

app.get('/sessions/new', function(req, res) { //return login form
	if(req.session.lError == null) {
		//default login form
	} else {
		//loginform with error message here
	}
});

app.post('/sessions/create', function(req, res) { //logs user in, redirects to /feed, if unsucessful, redirect to /sessions/new with error
	var uname = req.body.username;
	var pass = req.body.password;
	//encode
	
	//interact with database
	
	if(querySuccess) {
		req.session.valid = true;
		req.session.lError = null;
		res.redirect('/feed');
		
	} else {
		req.session.lError = true;
		res.redirect('/sessions/new');
	}
	res.send();
});

app.get('/photos/new', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		//serve image upload form
	}
});

app.post('/photos/create', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		//deal with uploaded image
		//upload file
		//update database
			//write to user stream
			//write to followers' streams
	}
});

app.get('/photos/thumbnail/:id.:ext', function(req, res) {
	var id = req.params.id;
	var ext = req.params.ext;
	
	//query database for photo
	
	if(querySuccess) {
		var fLocation = pDir + ; //path to photo
		res.writeHead(200, {
			'Content-Type' : 'image/'+ext
		});
		gm(fLocation).resize(400).stream(function (err, stdout, stderr) {
			if (err)
				util.log('Resizing Error');
			else
				stdout.pipe(res);
		});
	} else
		respond404('Photo Not Found', res);
});

app.get('/photos/:id.:ext', function(req, res) {
	var id = req.params.id;
	var ext = req.params.ext;
	
	//query database for photo
	
	if(querySuccess) {
		var fLocation = pDir + ; //path to photo
		res.writeHead(200, {
			'Content-Type' : 'image/'+ext
		});
		gm(fLocation).stream(function (err, stdout, stderr) {
			if (err)
				util.log('Photo Streaming Error');
			else
				stdout.pipe(res);
		});
	} else
		respond404('Photo Not Found', res);
});

app.get('/feed', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new');
		res.send();
	} else {
		//check query string jere
		
		//serve feed here
	}
});

/*
 * Admin Requirement Functions
 */
app.get('/bulk/clear', function(req, res) {
	//drop all tables and regenerate blank ones
});

app.post('/bulk/users', function(req, res) {
	
});

app.post('/bulk/streams', function(req, res) {
	
});

/*
 * Homepage catch
 */
app.get('/', function(req, res) {
	if(req.session.valid == null)
		res.redirect('/sessions/new');
	else
		res.redirect('/feed');
	res.send();
});

app.get('*', function(req, res) { //unknown path
	respond404('Unknown Path', res);
});

/*
 * Register other requests
 * eg: css, scripts, ...
 */

/*
 * Helper Functions Below
 */
function respond404(message, res) {
	util.log(message);
	res.send(404, message);
}

function respond500(message, res) {
	util.log(message);
	res.send(500, message);
}

function logOut(req, res) {
		req.session.destroy(function(err) { //to log out of cookie sessions
			if(err)							//set them to null
				util.log('Error Destroying Session');
		});
		res.redirect('/sessions/new');
		res.send();
}

app.listen(8080);
