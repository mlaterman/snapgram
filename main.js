var express = require('express');
var util = require('util');
var gm = require('gm');
var fs = require('fs');
var db = require('./db');

var app = express();
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.session({
	key : 'sid',
	secret : 's3cr3t'
})); //use session or cookieSession?
app.use(express.bodyParser());//bodyParser includes express.json
app.set('view engine', 'jade');
app.use(app.router);

var passwrd = "thunder";//bulk password

/*
 * Session variables:
 * valid - end user is logged in
 * lError - login/create account error occured
 * userid - user's id number
 * username - the user's login name
 */
 
/*
 * Requests needed for basic functionality
 */
app.get('/users/new', function(req, res) { //return user signup form
	if(req.session.lError == null) {
		res.render('sign_up', {title : "User Sign-Up"});
	} else {
		res.render('sign_up', {title : "User Sign-Up", error : "User Already Exists"});
	}
});

app.post('/users/create', function(req, res) { //create user from body info, logs in and redirects to feed
	var uname = req.body.username;
	var pass = req.body.password;
	var fname = req.body.fullname;
	
	db.addUser(uname, fname, pass, new Date(), function(err, data) {
		if(err) {
			respond500('Database Error', res);
		} else {
			if(data > 0) { //creation successful; set user id to data
				req.session.valid = true;
				req.session.lError = null;
				req.session.userid = data;
				req.session.username = uname;
				res.redirect('/feed');
				res.send();
			} else if(data == 0) { //user already exists
				req.session.lError = true;
				res.redirect('/users/new');
				res.send();
			} else { //some error occured
				respond500('Unkown Error in account Creation', res);
			}
		}
	});
});

app.get('/users/:id/follow', function(req, res) {
	var id = req.params.id;
	
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		db.follow(req.session.userid, id, function(err) {
			if(err) { 
				respond500('Failed to follow user id: '+id, res);//assume DB failure
			} else { // success
				res.redirect('/users/'+id);
				res.send();
			}
		});
	}
});

app.get('/users/:id/unfollow', function(req, res) {
	var id = req.params.id;
	
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		db.unFollow(req.session.userid, id, function(err) {
				if(err) {
					respond500('Failed to unfollow user id: '+id, res);
				} else {
					res.redirect('/users/'+id);
					res.send();
				}
		});
	}
});

app.get('/users/:id', function(req, res) {
	var id = req.params.id;
	db.checkUserID(id, function(err, val) {
		if(err) {
			respond500('Database Failure', res);
		} else if(!val) {
			respond404('User id: '+id+' not found', res);
		} else {
			db.getMyFeed(id, function(ferr, rows) {
				if(ferr) {
					respond500('Database Failure', res);
				} else {
					var page = req.query.page;
					var photos = photoQuery(page, rows);
					db.checkFollow(req.session.userid, id, function(folErr, isFollowing) {
						if(folErr) {//do not show follow or unfollow buttons if there is an error checking follows status
							isFollowing = "Unable to resolve follow status";
						} else {//set isFollowing to proper string
							isFollowing = isFollowing ? '2' : '0';
						}
						page = (page == null || page < 2 || isNaN(page)) ? 2 : parseInt(page, 10) + 1;
						db.getUserName(id, function(uErr, uname) {
							if(uErr) {
								util.log('Unable to get username for id: '+id);
								uname = "???"
							}
							res.render('feed', {title : uname+"'s Feed",username : uname, preq : page.toString(), myPage : isFollowing, uid : id, images : photos});
						});
					});
				}
			});
		}
	});
});

app.get('/sessions/new', function(req, res) { //return login form
	if(req.session.lError == null) {
		res.render('login', {title : "Login Page"});
	} else {
		res.render('login', {title : "Login Page", error : "Login Failed"});
	}
});

app.post('/sessions/create', function(req, res) { //logs user in, redirects to /feed, if unsucessful, redirect to /sessions/new with error
	var uname = req.body.username;
	var pass = req.body.password;
	
	db.checkPassword(uname, pass, function(err, id) {
			if(err) {
				respond500('Database Failure', res);
			} else if(id > 0) { //user found
				req.session.valid = true;
				req.session.lError = null;
				req.session.userid = id;
				req.session.username = uname;
				res.redirect('/feed');
				res.send();
			} else { //no user found
				req.session.lError = true;
				res.redirect('/sessions/new');
				res.send();
			}
	});
});

app.get('/photos/new', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new')
		res.send();
	} else {
		res.render('upload', {title : "Upload Photo"});
	}
});

app.post('/photos/create', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new');
		res.send();
	} else {
		var uid = req.session.userid;
		var uFile = req.files.image;
		db.addPhoto(uid, new Date(), uFile.name, function(err, pid) {
			if(err) {
				respond500('Database Error Uploading Photo', res);
			} else {//pid returned
				var ext = (uFile.name).match(/\.[a-zA-Z]{1,4}$/);
				if(ext == null) { //no extension
					respond400('No extension found', res);
				} else {
					var path = './photos/'+pid+ext[0];
					var fStream = fs.createReadStream(uFile.path);
					var oStream = fs.createWriteStream(path);
					fStream.pipe(oStream, {end : false});
					fStream.on('end', function() {
						db.addPath(pid, path, function(val) {
							if(val == 0) {//error updateing path on server
								db.deletePhoto(req.session.userid, pid, function(e){});
								fs.unlink(path, function(e){});
							}
						});
						res.redirect('/feed');//file was uploaded
						res.send();
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
			res.status(200);
			res.set('Content-Type', 'image/'+ext);
			gm(path).resize(400).stream(function (serr, stdout, stderr) {
				if(serr) {
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
			res.status(200);
			res.set('Content-Type', 'image/'+ext);
			gm(path).stream(function (serr, stdout, stderr) {
				if(serr) {
					util.log('Photo Streaming Error');
				} else {
					stdout.pipe(res);
				}
			});
		}
	});
});

app.get('/home/courses/s513/w2014/pics/:id.:ext', function(req, res){
	var id = req.params.id - 1;
	var ext = req.params.ext;
	
	db.getPath(id, function(err, path) {
		if(err) {
			respond404('Photo not found', res);
		} else {
			res.status(200);
			res.set('Content-Type', 'image/'+ext);
			console.log(path);
			gm(path).stream(function (serr, stdout, stderr) {
				if(serr) {
					util.log('Photo Streaming Error');
				} else {
					stdout.pipe(res);
				}
			});
		}
	});
});

app.get('/users/home/courses/s513/w2014/pics/:id.:ext', function(req, res){
	var id = req.params.id - 1;
	var ext = req.params.ext;
	
	db.getPath(id, function(err, path) {
		if(err) {
			respond404('Photo not found', res);
		} else {
			res.status(200);
			res.set('Content-Type', 'image/'+ext);
			console.log(path);
			gm(path).stream(function (serr, stdout, stderr) {
				if(serr) {
					util.log('Photo Streaming Error');
				} else {
					stdout.pipe(res);
				}
			});
		}
	});
});

app.get('/feed', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new');
		res.send();
	} else {
		db.getFeed(req.session.userid, function(err, rows) {
			if(err) {
				respond500('Error Reading Feed', res);
			} else {
				var page = req.query.page;
				var photos = photoQuery(page, rows);
				page = (page == null || page < 2 || isNaN(page)) ? 2 : parseInt(page, 10) + 1;
				res.render('feed', {title : "My Feed", username : req.session.username, preq : page.toString(), myPage : '1', images : photos});
			}
		});
	}
});

/*
 * Admin Requirement Functions
 */
app.get('/bulk/clear', function(req, res) {
	if(req.query.password == passwrd) {
		console.log("Before clearing the tables");
 		db.deleteTables(function(){
             console.log("After clearing the tables");
             db.createTables(function(){
                 console.log("After creating new tables");
                 res.send(200, "Tables cleared");
             });
         });
	} else {
		respond400('Incorrect Password', res);
	}
});

app.post('/bulk/users', function(req, res) {
	if(req.query.password == passwrd) {
		var num = req.body.length;
		var users = new Array()
		for(var i = 0; i < num; i++) {
			users.push(req.body[i]);
			var id = req.body[i].id;
			var name = req.body[i].name;
			var password = req.body[i].password;
			db._userInsert(id,"bulk "+name,name,password);
		}
		users.forEach(function(user) {
			var id = user.id;
			var flist = user.follows;
			flist.forEach(function(fid) {
				db.follow(id, fid, function(e) {});
			});
		});
		res.send(200, "Users uploaded");
	} else {
		respond400('Incorrect Password', res);
	}
});

app.post('/bulk/streams', function(req, res) {
	if(req.query.password == passwrd) {
		var num = req.body.length;
		for(var i = 0; i < num; i++) {
			var id = req.body[i].id;
			var uid = req.body[i].user_id;
			var path = req.body[i].path;
			var ts = new Date(req.body[i].timestamp);
			db._photoInsert(id, uid, ts, "bulk"+id, path);
		}
		res.send(200, "Feeds Uploaded");
	} else {
		respond400('Incorrect Password', res);
	}
});

/*
 * Register other requests
 * eg: css, scripts, ...
 */
 app.get('/js/bootstrap.js', function(req, res) {
	 res.sendfile('./public/js/bootstrap.js');
});

 app.get('/js/jquery-2.1.0.js', function(req, res) {
	 res.sendfile('./public/js/jquery-2.1.0.js');
});
 
app.get('/stylesheets/style.css', function(req, res) {
	res.sendfile('./public/stylesheets/style.css');
});

app.get('/stylesheets/image.css', function(req, res) {
	res.sendfile('./public/stylesheets/image.css');
});

app.get('/stylesheets/texts.css', function(req, res) {
	res.sendfile('./public/stylesheets/texts.css');
});

app.get('/stylesheets/bootstrap.css', function(req, res) {
	res.sendfile('./public/stylesheets/bootstrap.css');
});

app.get('/logout', function (req, res) {
	req.session.destroy(function(err) { //to log out of cookie sessions
		if(err) {						//set them to null
			util.log('Error Destroying Session');
		}
	});
	res.redirect('/sessions/new');
	res.send();
});

app.get('/favicon.ico', function (req, res) {
	res.sendfile('./photos/favicon.ico');
})

/*
 * Homepage catch
 */
app.get('/', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new');
	} else {
		res.redirect('/feed');
	}
	res.send();
});

app.get('*', function(req, res) { //unknown path
	respond404('Unknown Path: '+req.path, res);
});

/*
 * Helper Functions Below
 */
function respond400(message, res) {
	util.log(message);
	res.render(400, {
		status : 400,
		error : message,
		title : "400 - Bad Request"
	});
}
function respond404(message, res) {
	util.log(message);
	res.render(404, {
			status : 404,
			error : message,
			title : "404 - Page Not Found"
	});
}
function respond500(message, res) {
	util.log(message);
	res.render(500, {
		status : 500,
		error : message,
		title : "500 - Server Error"
	});
}
/*
 * Method for handleing querystrings for feeds
 * Returns upto 30 photos. If the passed page value is null, less than 2
 * or not a number, the first 30 are chosen. If the starting page results
 * ina value larger than the full collection a recursive call is made
 * with page-1.
 * @page the requested page to view
 * @rows the full collection of photos
 * @return a slice of the collection
 */ 
function photoQuery(page, rows) {
	var photos;
	if (page == null || page < 2 || isNaN(page)) {
		return _photosQueryDefault(rows)
	} else {
		var start = (page-1)*30;
		if(start > rows.length) {
			return photoQuery(page-1, rows);
		} else {
			var end = start+30 < rows.length ? start+30 : rows.length;
			return JSON.stringify(rows.slice(start, end));
		}
	}	
}
//By default get upto the first 30 objects
function _photosQueryDefault(rows) {
	var end = 30 < rows.length ? 30 : rows.length;
	return JSON.stringify(rows.slice(0, end));
}

db.createTables(function(){
	app.listen(8502);//run the server
});//ensure there is a database

module.exports = app;
