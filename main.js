var express = require('express');
var mysql = require('mysql');
var util = require('util');
var gm = require('gm');
var fs = require('fs');
var db = require('./db');

var app = express();

app.use(express.cookieParser());
app.use(express.session({
	key : 'sid',
	secret : 's3cr3t'
})); //use session or cookieSession?
app.engine('jade', require('jade').__express);
/*
 * Session variables:
 * valid - end user is logged in
 * lError - login/create account error occured
 * id - user's id number
 */
 
 var pDir = './photos/'; //base path to image directory

/*
 * Requests needed for basic functionality
 */
 //TODO: complete this
app.get('/users/new', function(req, res) { //return user signup form
	if(req.session.lError == null) {
		res.render('sign_up', {});
	} else {
		res.render('sign_up', {error : "User Already Exists"});//TODO: ensure message is applied
	}
});
//TODO: password hashing at DB
app.post('/users/create', function(req, res) { //create user from body info, logs in and redirects to feed
	var uname = req.body.username;
	var pass = req.body.password;
	var fname = req.body.fullName;
	
	db.addUser(uname, fname, pass, new Date(), function(err, data) {
		if(err) {
			respond500('Database Error', res);
		} else {
			if(data > 0) { //creation successful; set user id to data
				req.session.valid = true;
				req.session.lError = null;
				req.session.id = data;
				res.redirect('/feed');
				res.send();
			} else if(data == -1) { //user already exists
				req.session.lError = true;
				res.redirect('/users/new');
				res.send();
			} else { //some error occured
				respond500('Unkown Error in account Creation', res);
			}
		}
	});
});
//TODO: complete this
app.get('/users/:id/follow', function(req, res) {
	var id = req.params.id;
	
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		db.follow(req.session.id, id, function(err) {
			if(err) { //TODO: check to see if DB failed or if user was already being followed
				
			} else { // success
				res.redirect('/users/'+id);
				res.send();
			}
		});
	}
});
//TODO: complete this
app.get('/users/:id/unfollow', function(req, res) {
	var id = req.params.id;
	
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		db.unFollow(req.session.id, id, function(err) {
				if(err) {
					//TODO: same check as follow
				} else {
					res.redirect('/users/'+id);
					res.send();
				}
		});
	}
});
//TODO: complete this
app.get('/users/:id', function(req, res) {
	var id = req.params.id;
	
	db.getFeed(id, function(err, rows) {//TODO: change Function
		if(err) {
			//check to see if id exists
				//return 500 if it does
				//return 404 if not
		} else {
			//create feed
			res.render('feed', {});//?
		}
	});
});
//TODO: error message ok?
app.get('/sessions/new', function(req, res) { //return login form
	if(req.session.lError == null) {
		res.render('login', {});//default login form
	} else {
		res.render('login', {error : "Login Failed"});
	}
});
//TODO: complete this
app.post('/sessions/create', function(req, res) { //logs user in, redirects to /feed, if unsucessful, redirect to /sessions/new with error
	var uname = req.body.username;
	var pass = req.body.password;
	//TODO: getpassword or if_usr_exists?
	//or a new method that return t/f
	
	if(querySuccess) {
		req.session.valid = true;
		req.session.lError = null;
		req.session.id = //set user's id
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
		res.render('upload', {});
	}
});
//TODO:  ensure jade image field is called image
app.post('/photos/create', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		var uid = req.session.id;
		var file = req.files.image;
		
		db.addPhoto(uid, new Date(), file.name, function(err, pid) {
			if(err) {
				respond500('Database Error Uploading Photo', res);
			} else {
				var ext = (file.name).match(/\.[a-zA-Z]{1,4}$/);
				if(ext == null) { //no extension?
					respond400('No extension found', res);
				} else {
					fs.writeFile(pDir+pid+ext[0], file, function(fserr) {
						if(fserr) {
							db.deletePhoto(req.session.id, pid, function(e){});
							respond500('Filesystem Error Uploading Photo', res);
						} else {
							db.addPath(pid, pDir+pid+'.png', function(val) {
									if(val == 0) {
										db.deletePhoto(req.session.id, pid, function(e){});
										fs.unlink(pDir+pid+ext[0], function(e){});
									}
							});
							res.redirect('/feed');//file was uploaded
							res.send();
						}
					});
				}
			}
		});
	}
});

app.get('/photos/thumbnail/:id.:ext', function(req, res) {
	var id = req.params.id;
	var ext = req.params.ext;
	
	db.getPath(id, function(err, path) {
		if(err) {
			respond404('Photo not found', res);
		} else {
			res.writeHead(200, {
				'Content-Type' : 'image/'+ext
			});
			gm(path).resize(400).stream(function (err, stdout, stderr) {
				if(err) {
					util.log('Resizing Error');
				} else {
					stdout.pipe(res);
				}
			});
		}
	});
});

app.get('/photos/:id.:ext', function(req, res) {
	var id = req.params.id;
	var ext = req.params.ext;
	
	db.getPath(id, function(err, path) {
		if(err) {
			respond404('Photo not found', res);
		} else {
			res.sendFile(path, function(ferr) {
					if(ferr) {
						respond500('File Failure', res);
					}
			});
			/*res.writeHead(200, {
				'Content-Type' : 'image/'+ext
			});
			gm(path).stream(function (err, stdout, stderr) {
				if (err) {
					util.log('Photo Streaming Error');
				} else {
					stdout.pipe(res);
				}
			});*/
		}
	});
});
//TODO: Complete this
app.get('/feed', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new');
		res.send();
	} else {
		db.getFeed(req.session.id, function(err, rows) {
			if (err) {
				respond500('Error Reading Feed', res);
			} else {
				//TODO: what are in rows?
				res.render('feed', {});
			}
		});
	}
});

/*
 * Admin Requirement Functions
 */
app.get('/bulk/clear', function(req, res) { //TODO: Check these functions
	db.deleteDB();
	db.createDB();
});
//TODO: complete this
app.post('/bulk/users', function(req, res) {
	
});
//TODO: complete this
app.post('/bulk/streams', function(req, res) {
	
});

/*
 * Register other requests
 * eg: css, scripts, ...
 */
app.get('/stylesheets/style.css', function(req, res){
	res.sendFile('./stylesheets/style.css');
});

app.get('/stylesheets/image.css', function(req, res){
	res.sendFile('./stylesheets/image.css');
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
 * Helper Functions Below
 */
function respond400(message, res) {
	util.log(message);
	res.send(400, message);
}
 
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
			if(err) {						//set them to null
				util.log('Error Destroying Session');
			}
		});
		res.redirect('/sessions/new');
		res.send();
}

db.createDB();
app.listen(8500);
