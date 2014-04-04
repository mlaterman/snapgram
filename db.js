var mysql = require('mysql');
var async = require('async');
var pc = require('./passwdCrypt');

var db_config = {
    host : 'web2.cpsc.ucalgary.ca',
    user : 's513_mlaterma',
    password : '10133713',
    database :'s513_mlaterma',
    multipleStatements : true,
    connectionLimit : 2
};
var pool = mysql.createPool(db_config);

//function to create a database 'db' with four tables: users, photos, followship, stream; 
var createTables = function() {
        // create a table called 'users'  with fileds
    var usr_fld = "( uid INT UNSIGNED NOT NULL AUTO_INCREMENT  primary key, \
		    fullname char(20) not null, \
		    usrname char(20) not null, \
		    passwd char(40) not null, \
		    joinDate DATETIME);";
    var crt_usr_tbl = 'CREATE TABLE IF NOT EXISTS users ' + usr_fld;
    // create a table called 'photos' to store all the uploaded photos and theirs infos
    var photo_fld = "( pid INT UNSIGNED NOT NULL AUTO_INCREMENT primary key," +
		    " uid INT UNSIGNED, " +
		    " timeStamp DATETIME, " +
		    " name VARCHAR(30), " +
		    " path VARCHAR(40), " +
		    " FOREIGN KEY (uid) REFERENCES users (uid) );" ;

    var crt_photo_tbl = 'CREATE TABLE IF NOT EXISTS photos ' + photo_fld;
    // create a table called 'followship' to store the relationship among followers and followees
    var flw_fld = "( fid INT UNSIGNED NOT NULL AUTO_INCREMENT primary key, " +
		   " flwr_id INT UNSIGNED, flwe_id INT UNSIGNED, " +
		   " FOREIGN KEY (flwr_id) REFERENCES users (uid), " +
		   " FOREIGN KEY (flwe_id) REFERENCES users (uid) );";

    var crt_flw_tbl = 'CREATE TABLE IF NOT EXISTS followship ' + flw_fld;
    // create a table called 'stream' to add a photo uploaed by a person to all his followers
    var stream_fld = "( sid INT UNSIGNED NOT NULL AUTO_INCREMENT primary key, " +
		      " uid INT UNSIGNED, pid INT UNSIGNED, " +
		      " source VARCHAR(40), " +
		      " FOREIGN KEY (uid) REFERENCES users (uid) , " +
		      " FOREIGN KEY (pid) REFERENCES photos (pid) );";
    var crt_strm_tbl = 'CREATE TABLE IF NOT EXISTS stream ' + stream_fld;

    var query = crt_usr_tbl + crt_photo_tbl + crt_flw_tbl + crt_strm_tbl;

	pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(query, function(err) {
			if(err) {
				console.log('Error in creating tables');
				throw err;
			}
			connection.release();
        });
    });
} 
 // to delete a database 
var deleteTables = function() {
    var sql = "SET FOREIGN_KEY_CHECKS = 0;" +
	      "DROP table if exists users; " + 
	      "drop table if exists photos; " +
	      "drop table if exists followship; " +
	      "drop table if exists stream; " +
	      "SET FOREIGN_KEY_CHECKS = 1;";
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, function(err, results) {
			if(err) {
				console.log(err);
			}
			connection.release();
		}); 
	});
}
// add a user to the 'user' table, return UID if succeed,return uid, otherwise -1;
// @param  username 
// @param  fullname
// @param  password
// @param  joinDate: timestamp the data and time that the user register, format: 'YYYY-MM-DD HH:MM:SS'
// @output  if adding a user successfully, the data parameter in the callback is the uid, if user has alread existed, data is 0;
function addUser(username, full_name, password, ts, callback) {
	var sql = " INSERT INTO users (fullname, usrname, passwd, joinDate)" +
	      " SELECT * FROM ( SELECT ?, ?, ?, ? ) AS tmp " +
	      " WHERE NOT EXISTS ( " +
	      " SELECT usrname FROM users WHERE  usrname = ? " +
	      " ) LIMIT 1;";
     pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [full_name, username, pc.encrypt(password),ts,username], function(err, results) {
			if(err) {
				throw err;
			} else {
				callback(null, results.insertId);
			}
			connection.release();
        });
	});
}
//Check the provided password whether is belong to the user userName 
//callback(err, uid) If password and userName match, uid is the user's ID, otherwise, 0; When error happend, match is null;
//@param userID: a unsigned int
//@password: a string
function checkPassword(userName, password, callback) {
    var sql = 'SELECT passwd,uid FROM users WHERE usrName = ?';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [userName], function(err, rows) {
            if(err) {
                callback(err, null);
            } else {
                if(_isEmpty(rows)) {
					callback(null,0);
                } else {
					if(mysql.escape(pc.decrypt(rows[0].passwd)) == mysql.escape(password)) {
						callback(null, rows[0].uid);
					} else {
						callback(null, 0);
					}
                }
            }
            connection.release();
        });
    });
}
// add a photo to the 'photos' table
// @param userId
// @param ts: timestampe, format : 'YYY-MM-DD HH:MM:SS'
// @param fname: photo's name
// @param callback: callback function, with two parameters, f(err, pid), 1st is err message and 2nd is photo id.
function addPhoto(userID,ts,fname, callback) {
    var sql = 'INSERT INTO photos (uid, timestamp, name) VALUES (?,?,?)';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [userID, ts, fname], function(err, rows) {
            if(err) {
                callback(err,null);
            } else {
                //insert the photo to its own strem 
                addToStream(userID, rows.insertId, function(err) {
					if(err) {
						callback(err,null);
					}
                });
                //insert the photo to its followers' stream
                _getFollower(userID, function(err,followers) {
					if(err) {
						callback(err,null);
					} else {
						async.each(followers, function(fid, cb) {
							addToStream(followers[fid], rows.insertId, function(err) {
								if(err) {
									cb(err);
								}
							});
							cb(null);
						}, function(err) {
							if(err) {
								throw err;
							} else {						
								callback(null,rows.insertId);
							}
						})
                    }
                });
            }	
        });
		connection.release();
    });
}
//add a path to a record with specified photo id, if succeeds, return 1, otherwise, return 0
function addPath(pid, path, callback) {
    var sql = 'UPDATE photos SET path = ? where pid = ?';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [path, pid], function(err, results) {
			if(err) {
				callback(err, 0);
			} else {
				callback(null, 1);
			}
			connection.release();
        })
    });
}
//delete a row with photo id as the input one. callback(err,data), if succeed in deleting, data is 1, otherwise, data is null;
function deletePhoto(userID, pid, callback) {
    var sql = "delete from stream where pid = ?;" +
	      "delete from photos where pid = ? and uid =?;";
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [pid, pid, userID], function(err) {
			if(err) {
				callback(err,null);
			} else {
				callback(err,1);
			}
			connection.release();
        });
    });
}
    
//get the storage path of a photo with ID as pid. Return PATAH if succeeds. otherwise, throw an error. 
function getPath(pid, callback) {
    var sql = 'SELECT path FROM photos WHERE pid = ?';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [pid], function(err, rows) {
            if(err) {
                callback(err,null);
            } else if(_isEmpty(rows)) {
                callback("No such pid",null);
            } else {
                callback(null,rows[0].path);
			}
            connection.release();
        });

    });
}
function _isEmpty(obj) {
    for(var key in obj) {
		if(obj.hasOwnProperty(key)) {
			return false;
		}
	}
    return true;
}
//a follower is a person who follows others (followees)
//a followee is a person who is followed by followers
//if a follower follows a followee succeeds, the data in callback is 1;
//if a follower has already followed a followee, the data in callback is 0;
//in other cases, data is null
function follow(followerID, followeeID, callback) {
    var sql =' INSERT INTO followship (flwr_id, flwe_id) '+
	     ' SELECT * FROM ( SELECT ?, ?) AS tmp ' +
	     ' WHERE NOT EXISTS ( ' +
	     '	    SELECT * FROM followship WHERE flwr_id =? and flwe_id = ? '+
	     ' ) LIMIT 1;';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [followerID, followeeID, followerID, followeeID], function(err, res) {
            if(err) {
                callback(err, null);
            } else {
                if(res.affectedRows ==1) {
					callback(null,1);
                } else {
					callback(null,0);
				}
            }
            connection.release();
        });
    
    });
}
//if unFollow successfully, the data of callback(err,data) is 1;if they have no followship before, the data will be 0;
function unFollow(followerID, followeeID, callback) {
    var sql = 'DELETE FROM followship WHERE flwr_id = ? AND flwe_id =? ';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [followerID, followeeID], function(err, results) {
            if(err) {
                callback(err,null);
            } else {
                if(results.affectedRows) {
					callback(null,1);
                } else {
					callback(null,0);
				}
            }
            connection.release();
		});
    });
}

function addToStream(userID,photoID, callback) {
    var sql = 'INSERT INTO stream (uid, pid) VALUES (?, ?)';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [userID, photoID], function(err, results) {
            if(err) {
                callback(err);
            } else {
                callback(null);
			}
            connection.release();
        });
    });
}

function _getFollower(followeeID, callback) {
    var sql = 'SELECT flwr_id FROM followship WHERE flwe_id = ?';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [followeeID], function(err, rows) {
			if(err) {
				callback(err, null);
			} else {
				var followees = new Array();
				for(i=0;i<rows.length;++i) {
					followees[i]=rows[i].flwr_id;
				}
				callback(err, followees);
			}
			connection.release();
        });
    });
}
//return a user's feed   callback(err, photos)  photos is an object consisting of photos that should appear on the user's acnt
//Object photos has four field, (pid, path, name, timeStamp)
function getFeed(userID, callback) {
    var sql = 'SELECT photos.pid, photos.path, photos.name , photos.timeStamp, stream.source FROM photos, stream WHERE ' +
	' photos.pid = stream.pid and stream.uid =? ORDER BY photos.pid DESC';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [userID], function(err, rows) {
			if(err) {
				callback(err, null);
			} else {
				callback(null, rows);
			}
			connection.release();
        });
    });
}
//return information of photos uploaded by a user;
//input: user id
//output: a list of objects, each object has four fields (pid, name, path, timeStamp);
function getMyFeed(userID, callback){
    var sql = 'SELECT pid, name, path, timeStamp FROM photos where uid = ? ORDER BY pid DESC';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [userID], function(err, rows) {
			if(err) {
				callback(err, null);
			} else {
				callback(null, rows);
			}
			connection.release();
        });
    });
}
//check if followerId is following followeeID. If it is, return true, otherwise, return false;
function checkFollow(followerID, followeeID, callback) {
    var sql = 'SELECT * FROM followship WHERE flwr_id = ? and flwe_id = ?';
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [followerID, followeeID], function(err, rows) {
			if(err) {
				callback(err, null);
			} else {
				if(_isEmpty(rows)) {
					callback(null, false);
				} else {
					callback(null, true);
				}
			}
			connection.release();
        });
    });
}
//funtion for testing
//insert a usert to the database
function _userInsert(uid, fullName, usrName, password) {    
    var sql = 'INSERT INTO users (uid, fullname, usrname, passwd) '+
	      'VALUES (?, ?, ?, ?);';
	      
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [uid, fullName, usrName, pc.encrypt(password), usrName, uid], function(err) {
			if(err) {
				throw err;
			}
			connection.release();
        });
    });
}
//funtion for testing
//insert a photo to the database
function _photoInsert(fid, uid, ts, fname, path) {
    var sql = 'INSERT INTO photos (pid, uid, timeStamp, name, path) ' +
	      'VALUES ( ?, ?, ?, ?, ? );';
    
    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [fid, uid, ts, fname, path], function(err) {
			if(err) {
				throw err;
			}
			connection.release();
        });
    });
}

function getUserName(uid, callback) {
    var sql = 'SELECT usrname FROM users WHERE uid = ?;';

    pool.getConnection(function(err, connection) {
		if(err) {
			throw err;
		}
        connection.query(sql, [uid], function(err, rows) {
			if(err) {
				callback(err, null);
			} else if(_isEmpty(rows)) {
				callback('The id does not exist', false);
			} else {
				callback(null, rows[0].usrname);
			}
			connection.release();
        });
    });
}
module.exports.createTables = createTables;
module.exports.addUser = addUser;
module.exports.deleteTables = deleteTables;
module.exports.addPhoto = addPhoto;
module.exports.addPath = addPath;
module.exports.getPath = getPath;
module.exports.follow = follow;
module.exports.unFollow = unFollow;
module.exports.checkPassword = checkPassword;
module.exports.deletePhoto = deletePhoto;
module.exports.getFeed = getFeed;
module.exports.getMyFeed = getMyFeed;
module.exports._userInsert = _userInsert;
module.exports._photoInsert = _photoInsert;
module.exports.checkFollow = checkFollow;
module.exports.getUserName = getUserName;
