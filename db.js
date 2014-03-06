var mysql = require('mysql');

var db_config = {
    host: 'localhost',
    user: 'yao',
    password: 'ileng'
};

//function to create a database 'snapgram' with four tables: users, photos, followship, stream;
 var connection = mysql.createConnection(db_config);

var createDb = function () {
    // create a database called snapgram to store infos.
    connection.query('CREATE DATABASE IF NOT EXISTS snapgram', function (err){
	if(err) {
	    console.log('unable to create the database snapgram');
	    console.log(err);
	}
    });

    // use the created database
    connection.query('USE snapgram', function (err){
	if (err)
	    throw err;;
    })
    // create a table called 'users'  with fileds
    var usr_fld = "(uid INT UNSIGNED NOT NULL AUTO_INCREMENT  primary key, \
		    fullname char(20) not null, \
		    usrname char(20) not null, \
		    passwd char(20) not null, \
		    joinDate DATETIME)";
    var crt_usr_tbl = 'CREATE TABLE IF NOT EXISTS users ' + usr_fld;
    connection.query(crt_usr_tbl, function (err, results){
	if (err) throw err;
    });
    // create a table called 'photos' to store all the uploaded photos and theirs infos
    var photo_fld = "(pid INT UNSIGNED NOT NULL AUTO_INCREMENT primary key," +
		    " uid INT UNSIGNED, " +
		    " timeStamp DATETIME, " +
		    " name VARCHAR(30), " +
		    " path VARCHAR(40), " +
		    " FOREIGN KEY (uid) REFERENCES users (uid) )" 

    var crt_photo_tbl = 'CREATE TABLE IF NOT EXISTS photos ' + photo_fld;
    connection.query(crt_photo_tbl, function (err, results){
	if (err) throw err;
    });

    // create a table called 'followship' to store the relationship among followers and followees
    var flw_fld = "( fid INT UNSIGNED NOT NULL AUTO_INCREMENT primary key, " +
		   " flwr_id INT UNSIGNED, flwe_id INT UNSIGNED, " +
		   " FOREIGN KEY (flwr_id) REFERENCES users (uid), " +
		   " FOREIGN KEY (flwe_id) REFERENCES users (uid) )";

    var crt_flw_tbl = 'CREATE TABLE IF NOT EXISTS followship ' + flw_fld;
    connection.query(crt_flw_tbl, function (err, results){
	if (err) throw err;
    });
    // create a table called 'stream' to add a photo uploaed by a person to all his followers
    var stream_fld = "( sid INT UNSIGNED NOT NULL AUTO_INCREMENT primary key, " +
		      " uid INT UNSIGNED, pid INT UNSIGNED, " +
		      " FOREIGN KEY (uid) REFERENCES users (uid) , " +
		      " FOREIGN KEY (pid) REFERENCES photos (pid) )";
    var crt_strm_tbl = 'CREATE TABLE IF NOT EXISTS stream ' + stream_fld;
    connection.query(crt_strm_tbl, function(err, results){
	if (err) {
	    console.log("Error in creating the stream table. ");
	    throw err;
	}
    });
} 
 // to delete a database 
var deleteDb = function(){
    connection.query("drop database if exists snapgram", function(err, results){
       if(err) 
	console.log(err);
   }); 
}

var closeDb = function(){
    connection.end();
}
/*var closeDb = function (){
    connection.end();
};
*/

function _cst_connection(){
    return mysql.createConnection({
	host:hostName,
	user:userName,
	password:passwd,
	database:'snapgram'
    });
};
//hand a connection lost. Recreate a connection
function handleDisconnect(){
    connection = mysql.createConnection(db_config);

    connection.connect(function(err){
	if(err) {
	    console.log('error when connecting to db:', err);
	    setTimeout(handleDisconnect, 2000);
	    }
	});
    connection.on('error', function(err) {
	console.log('db error', err);
	if(err.code == 'PROTOCOL_CONNECTION_LOST') {
	    handleDisconnect();
	} else {
	    throw err;
	}
    });
}
// check the existence of a user account, return true if so, false otherwise;
function usr_is_exist(usrname,callback){
    var sql = "select * from users where usrname=" + mysql.escape(usrname);
    connection.query(sql, function(err, rows){
	if(err)
	    callback(err, null);
	if(rows.length){
	    //console.log(rows);
	    callback(null, true);
	}
	else
	    callback(null, false);
    });
}
// add a user to the 'user' table, return UID if succeed,return uid, otherwise -1;
// @param  username 
// @param  fullname
// @param  password
// @param  email?
// @param  joinDate: timestamp the data and time that the user register, format: 'YYYY-MM-DD HH:MM:SS'
// @output  if adding a user successfully, the data parameter in the callback is the uid, if user has alread existed, data is -1;
function addUser(username, full_name, password, ts, callback){
    var usr_exist = false;
    usr_is_exist(username, function(err, data){
	if(err) throw err;
	else{
	    if(!data){
	//return  a UID for the userj
		var sql = 'INSERT INTO users (fullname, usrname, passwd, joinDate)' +
		    ' VALUES ( ?, ?,?, ?)';
		connection.query(sql, [full_name, username, password, ts],function(err, results){
		    if (err)
			callback(err,null);
		    else{ 
			callback(null,results.insertId);
			//console.log(results.insertId);
		    }
		    })
	    }
	    else
		callback(null, -1);
	}
    });
}
//Taking a user name as parameter and return its corresponding password to callback function
// the callback function: callback(err, passwd) passwd is 0, if no such userName
function getPassword(userName, callback){
    var sql = 'SELECT passwd FROM users WHERE usrname =? ';
    connection.query(sql,[userName],function (err, rows){
	if(err){
	    callback(err, null);
	}
	else{
	    //console.log('userName is', userName);
	    //console.log(rows);
	    if(!_isEmpty(rows))
		callback(null, rows[0].passwd);
	    else
		callback(null, 0);
	}
    });
}
//Check the provided password whether is belong to a user with id as userID
//callback(err, match) If password and userId match, math is 1, otherwise, 0; When error happend, match is null;
//@param userID: a unsigned int
//@password: a string
function checkPassword(userID, password, callback){
    var sql = 'SELECT passwd FROM users WHERE uid = ?';
    connection.query(sql, [userID], function(err, rows){
	if(err){
	    callback(err, null);
	}
	else{
	    if(mysql.escape(rows[0].passwd) == mysql.escape(password))
		callback(null, 1);
	    else
		callback(null, 0);
	}
    });
}
// add a photo to the 'photos' table
// @param userId
// @param ts: timestampe, format : 'YYY-MM-DD HH:MM:SS'
// @param fname: photo's name
// @param callback: callback function, with two parameters, f(err, pid), 1st is err message and 2nd is photo id.
function addPhoto(userID,ts,fname, callback){
    var sql = 'INSERT INTO photos (uid, timestamp, name) VALUES (?,?,?)';
    connection.query(sql, [userID, ts, fname], function(err, rows){
	if(err){
	    callback(err,null);
	}
	else{
	    //insert the photo to its own strem 
	    addToStream(userID, rows.insertId, function(err){
		if(err)
		    callback(err,null);
	    });
	    //insert the photo to its followers' stream
	    _getFollower(userID, function(err,followers){
		if(err)
		    callback(err,null);
		else{
		    console.log("your followers is ", followers);
		    console.log(followers.length);
		    for (var fid in followers){
			addToStream(followers[fid], rows.insertId, function(err){
			    if(err){
				callback(err,null);
			    }
			});
		    }
		    callback(null,rows.insertId);
		}
	    });
	}
	
    });
}
//add a path to a record with specified photo id, if succeeds, return 1, otherwise, return 0
function addPath(pid, path, callback){
    var sql = 'UPDATE photos SET path = ? where pid = ?';
    connection.query(sql, [path, pid], function(err, results){
	if(err){
	    callback(err, 0);
	}
	callback(null, 1);
    })
}
//delete a row with photo id as the input one. callback(err,data), if succeed in deleting, data is 1, otherwise, data is null;
function deletePhoto(userID,pid, callback){
    _deleteFromStream(pid,function(err){
	if(err)
	    throw err;
	else{
	    var sql = 'DELETE FROM photos WHERE pid = ?';
		connection.query(sql,[pid], function(err, resutls){
		    if(err){
			console.log("before error");
			console.log(err);
			callback(err,null);
		    }
		    else{/*
			console.log("photo id is ", pid);
			deleteFromStream(userId, pid, function (err){
			    if (err)
				throw err;
			    else callback(null,1);
			});
		       _getFollower(userID, function(err, followees){
			   if(err)
			       callback(err, null);
			   else{
			       for ( var fid in followees){
				   deleteFromStream(followees[fid],pid, function(err){
					if(err)
					    callback(err, null);
				});
			       }
			   }
		       });*/
			     callback(null, 1);
			    }
		});

	}
    });

}
//get the storage path of a photo with ID as pid. Return PATAH if succeeds. otherwise, throw an error. 
function getPath(pid, callback){
    var sql = 'SELECT path FROM photos WHERE pid = ?';
    connection.query(sql, [pid], function(err, rows){
	if(err){
	    callback(err,null);
	}
	callback(null,rows[0].path);
    });
}
function _isEmpty(obj) {
    for(var key in obj) {
	if(obj.hasOwnProperty(key))
	    return false;
    }
    return true;
}
//a follower is a person who follows others (followees)
//a followee is a person who is followed by followers
//add a followee to a follower, if not succeeds, throw an error;
function follow(followerID, followeeID, callback){
    var sql = 'SELECT fid  FROM followship WHERE flwr_id = ? AND flwe_id = ?';
    connection.query(sql, [followerID, followeeID], function (err, results){
	if(err)
	    callback(err);
	else if(_isEmpty(results)){ // result is empty. there's not following relationship yet. create one
	    var sql = 'INSERT INTO followship (flwr_id, flwe_id) VALUES (?, ?)';
	    connection.query(sql,[followerID, followeeID], function(err, results){
		if(err){
		    callback(err);
		}
		else
		    callback(null);
	    });
	}
	else{
	    console.log('Already followed'); //for debug
	    callback(null);
	}
    
    });
}
function unFollow(followerID, followeeID, callback){
    var sql = 'DELETE FROM followship WHERE flwr_id = ? AND flwe_id =? ';
    connection.query(sql, [followerID, followeeID], function(err, results){
	if(err){
	    callback(err);
	}
	else
	    callback(null);
    });
}
function addToStream(userID,photoID, callback){
    var sql = 'INSERT INTO stream (uid, pid) VALUES (?, ?)';
    connection.query(sql, [userID, photoID], function(err, results){
	if(err){
	    callback(err);
	}
	else
	    callback(null);
    });
}
function _deleteFromStream(photoID, callback){
    var sql = 'DELETE FROM stream WHERE pid = ?';
    connection.query(sql, [photoID], function (err, results){
	if(err){
	    callback(err);
	}
	else
	    callback(null);
    });
}
function _getFollower(followeeID, callback){
    var sql = 'SELECT flwr_id FROM followship WHERE flwe_id = ?';
    connection.query(sql, [followeeID], function (err, rows){
	if(err)
	    callback(err, null);
	else{
	    var followees = new Array();
	    for(i=0;i<rows.length;++i){
		followees[i]=rows[i].flwr_id;
	    }
	    callback(err, followees);
	}
    });
}
//return a user's feed   callback(err, photos)  photos is an object consisting of photos that should appear on the user's acnt
//Object photos has three field, (pid, path, name)
function getFeed(userID, callback){
    var sql = 'SELECT photos.pid, photos.path, photos.name FROM photos, stream WHERE ' +
	' photos.pid = stream.pid and stream.uid =? ORDER BY photos.pid DESC';
    connection.query(sql, [userID], function (err, rows){
	if(err)
	    callback(err, null);
	else{
	    callback(null, rows);
	}
    });
}
//return information of photos uploaded by a user;
//input: user id
//output: a list of objects, each object has three fields (pid, name, path);
function getMyFeed(userID, callback){
    var sql = 'SELECT pid, name, path FROM photos where uid = ? ORDER BY pid DESC';
    connection.query(sql, [userID], function (err, rows){
	if(err)
	    callback(err, null);
	else
	    callback(null, rows);
    });
}
//function _end_connection(){
//};
module.exports.createDb = createDb;
module.exports.usr_is_exist = usr_is_exist;
module.exports.addUser = addUser;
module.exports.deleteDb = deleteDb;
module.exports.closeDb = closeDb;
module.exports.getPassword = getPassword;
module.exports.addPhoto = addPhoto;
module.exports.addPath = addPath;
module.exports.getPath = getPath;
module.exports.follow = follow;
module.exports.unFollow = unFollow;
module.exports.checkPassword = checkPassword;
module.exports.deletePhoto = deletePhoto;
module.exports.getFeed = getFeed;
module.exports.getMyFeed = getMyFeed;
