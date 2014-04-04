var cluster = require('cluster');
var express = require('express');
var util = require('util');
var gm = require('gm');
var fs = require('fs');
var async = require('async');
var LRU = require('lru-cache');
var db = require('./db');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);

var app = express();
app.use(express.logger());
app.use(express.cookieParser());
app.use(session({
	store : new RedisStore({
		host : 'localhost',
		port :  8511,
		db : 1
	}),
	key : 'sid',
	secret : 's3cr3t'
}));
app.use(express.bodyParser());
app.set('view engine', 'jade');
app.use(app.router);

var passwrd = "thunder";//bulk password
var icache, scache;//image and stylesheet cache

/*
 * Session variables:
 * valid - end user is logged in
 * lError - login/create account error occured
 * userid - user's id number
 * username - the user's login name
 * 
 * TODO: forever
 */
 
/*
 * Requests needed for basic functionality
 */
app.get('/users/new', function(req, res) {
	if(req.session.lError == null) {
		res.render('sign_up', {title : "User Sign-Up"});
	} else {
		res.render('sign_up', {title : "User Sign-Up", error : "User Already Exists"});
	}
});

app.post('/users/create', function(req, res) {
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
			} else if(data == 0) { //user already exists
				req.session.lError = true;
				res.redirect('/users/new');
			} else { //some error occured
				respond500('Unkown Error in account Creation', res);
			}
		}
	});
});

app.get('/users/:id/follow', function(req, res) {
	var id = req.params.id;

	if(req.session.valid == null) {
		res.redirect('/sessions/new');
	} else {
		db.follow(req.session.userid, id, function(err) {
			if(err) { //assume DB failure
				respond500('Failed to follow user id: '+id, res);
			} else { // success
				res.redirect('/users/'+id);
			}
		});
	}
});

app.get('/users/:id/unfollow', function(req, res) {
	var id = req.params.id;

	if(req.session.valid == null) {
		res.redirect('/sessions/new')
	} else {
		db.unFollow(req.session.userid, id, function(err) {
				if(err) {
					respond500('Failed to unfollow user id: '+id, res);
				} else {
					res.redirect('/users/'+id);
				}
		});
	}
});

app.get('/users/:id', function(req, res) {
	var id = req.params.id;
	var page = req.query.page;
	async.parallel([
		function(callback) {
			db.getUserName(id, function(err, uname) {
				if(!uname)
					callback("User Not Found", null);
				else
					callback(err, uname);
			});
		},
		function(callback) {
			db.getMyFeed(id, function(ferr, rows) {
				var photos = photoQuery(page, rows);
				callback(ferr, photos);
			});
		},
		function(callback) {
			db.checkFollow(req.session.userid, id, function(folErr, isFollowing) {
				if(!folErr)
					isFollowing = isFollowing ? '2' : '0';
				callback(folErr, isFollowing);
			});
		}],
		function(err, value) {
			if(err) {
				if(err == "User Not Found")
					respond404(err, res);
				else
					respond500(err, res);
			} else {
				page = (page == null || page < 2 || isNaN(page)) ? 2 : parseInt(page, 10) + 1
				res.render('feed', {title : value[0]+"'s Feed",username : value[0], preq : page.toString(), myPage : value[2], uid : id, images : value[1]});
			}
		} 
	);
});

app.get('/sessions/new', function(req, res) {
	if(req.session.lError == null) {
		res.render('login', {title : "Login Page"});
	} else {
		res.render('login', {title : "Login Page", error : "Login Failed"});
	}
});

app.post('/sessions/create', function(req, res) {
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
			} else { //no user found
				req.session.lError = true;
				res.redirect('/sessions/new');
			}
	});
});

app.get('/photos/new', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new');
	} else {
		res.render('upload', {title : "Upload Photo"});
	}
});

app.post('/photos/create', function(req, res) {
	if(req.session.valid == null) {
		res.redirect('/sessions/new');
	} else {
		var uid = req.session.userid;
		var uFile = req.files.image;
		async.waterfall([
			function(callback) {
				db.addPhoto(uid, new Date(), uFile.name, function(err, pid) {
					var ext = (uFile.name).match(/\.[a-zA-Z]{1,4}$/);
					if(ext == null)
						callback(400, null);
					else {
						if(icache.has(pid+'.'+ext))
							icache.del(pid+'.'+ext);
						callback(err, pid, ext);
					}
				});
			},
			function(pid, ext, callback) {
				var path = './photos/'+pid+ext[0];
				var fStream = fs.createReadStream(uFile.path);
				var oStream = fs.createWriteStream(path);
				fStream.pipe(oStream, {end : false});
				fStream.on('error', function(err) {
					db.deletePhoto(req.session.userid, pid, function(e) {});
					callback(err);
				});
				fStream.on('end', function() {
					callback(null, pid, ext, path)});
			},
			function(pid, ext, path, callback) {
				db.addPath(pid, './photos/'+pid+ext[0], function(val) {
					if(val == 0) {//error updating path on server
						db.deletePhoto(req.session.userid, pid, function(e) {});
						fs.unlink(path, function(e){});
						callback('Unable to update path');
					} else {
						gm(path).resize(400).write('./photos/thumbnail/'+pid+ext[0], function(e) {});
						callback(null);
					}
				});
			}
		], function(err) {
			if(err === 400)
				respond400('Invalid File', res);
			else if(err)
				respond500('Server Error', res);
			else
				res.redirect('/feed');//file was uploaded
		});
	}
});

app.get('/photos/thumbnail/:id.:ext', function(req, res) {
	var id = req.params.id;
	var ext = req.params.ext;
	var img = icache.get(id+'.'+ext);
	
	if(img == null) {
		fs.readFile('./photos/thumbnail/'+id+'.'+ext, function(err, data) {
			if(!err) {//if the file is in photos/thumbnail
				icache.set(id+'.'+ext, data);
				res.type(ext);
				res.send(200, data);
			} else { //otherwise ask the db for the path
				async.waterfall([
					function(callback) {
						db.getPath(id, function(err, path) {
							if(err)
								callback(404, null);
							else
								callback(null, path);
						});
					},
					function(path, callback) {
						gm(path).resize(400).toBuffer(function (err, buff) {
							if(err)
								callback(err, null);
							else {
								icache.set(id+'.'+ext, buff);
								callback(null, buff);
							}
						});
					}
				], function(err, buff) {
					if(err === 404)
						respond404('File Not Found', res);
					else if (err)
						respond500('Server Error', res);
					else {
						res.type(ext);
						res.send(200, buff);
					}
				});
			}
		});
	} else {
		res.type(ext);
		res.send(200, img);
	}
});

app.get('/photos/:id.:ext', function(req, res) {
	var id = req.params.id;
	var ext = req.params.ext;
	
	db.getPath(id, function(err, path) {
		if(err) {
			respond404('Photo not found', res);
		} else {
			res.status(200);
			res.type(ext);
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
		db.deleteTables();
		db.createTables();
		icache.keys().forEach(function(key) {
				icache.del(key);
		});
		icache.reset();
		res.send(200, "Tables cleared");
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
			db._userInsert(id,name,name,password);
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
		async.each(req.body, function(body, callback) {
			var id = body.id+1;  // add one to the id to stop db issues
			var uid = body.user_id;
			var path = body.path;
			var ts = new Date(body.timestamp);
			var ext = path.match(/\.[a-zA-Z]{1,4}$/);
			db._photoInsert(id, uid, ts, id, path);
			callback();
		}, function(err) {
			if(err)
				util.log("ERROR WITH BULK PHOTO UPLOAD");
			res.send(200, "Feeds Uploaded");
		});
	} else {
		respond400('Incorrect Password', res);
	}
});

/*
 * Register other requests
 * eg: css, scripts, ...
 */
app.get('/stylesheets/style.css', function(req, res) {
	res.type('css');
	res.send(200, scache.get('style.css'));
});

app.get('/stylesheets/image.css', function(req, res) {
	res.type('css');
	res.send(200, scache.get('image.css'));
});

app.get('/stylesheets/bootstrap.css', function(req, res) {
	res.type('css');
	res.send(200, scache.get('bootstrap.css'));
});

app.get('/logout', function (req, res) {
	req.session.destroy(function(err) {
		if(err) {
			util.log('Error Destroying Session');
		}
	});
	res.redirect('/sessions/new');
	res.send(302);
});

app.get('/favicon.ico', function (req, res) {
	res.type('x-icon');
	res.send(200, scache.get('favicon.ico'));
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

function _cacheSetup() {
		icache = LRU({
			max : 97792*100,
			length : function(n){return n.length}
		});//thumbnail size png 95.5kb * 100
		scache = LRU({
			max : 123400,
			length : function(n){return n.length}
		});//css files are close to this size
		icache.keys().forEach(function(key) {
				icache.del(key);
		});
		icache.reset();
		fs.readFile('./public/stylesheets/style.css', function(err, data) {
			scache.set('style.css', data);
		});
		fs.readFile('./public/stylesheets/image.css', function(err, data) {
			scache.set('image.css', data);
		});
		fs.readFile('./public/stylesheets/bootstrap.css', function(err, data) {
			scache.set('bootstrap.css', data);
		});
		fs.readFile('./photos/favicon.ico', function(err, data) {
			scache.set('favicon.ico', data);
		});
}

//Use cluster to start many instances
if(cluster.isMaster) {
	db.createTables();//ensure there is a database
	var cpuCount = require('os').cpus().length;
	for(var i = 0; i < cpuCount; i += 1) {
		cluster.fork();
	}
} else {
	_cacheSetup();
	app.listen(8501);//run the server
}
//ensure there is a database
module.exports = app;
