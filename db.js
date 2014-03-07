var mysql = require('mysql');
var pc = require('./passwdCrypt');

var db_host = 'localhost', //web2.cpsc.ucalgary.ca
    db_user = 's513_yaozhao',
    db_password = '10125166';
    

var db_config = {
    host: db_host,
    user: db_user,
    password: db_password,
    database:'s513_yaozhao',
    multipleStatements:true
};

//function to create a database 'db' with four tables: users, photos, followship, stream; 
var createTables = function () {
    var connection = mysql.createConnection(db_config);
    connection.connect();

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
		      " FOREIGN KEY (uid) REFERENCES users (uid) , " +
		      " FOREIGN KEY (pid) REFERENCES photos (pid) );";
    var crt_strm_tbl = 'CREATE TABLE IF NOT EXISTS stream ' + stream_fld;

    var query = crt_usr_tbl + crt_photo_tbl + crt_flw_tbl + crt_strm_tbl;
    connection.query(query, function(err){
	if(err){
	    console.log('Error in creating tables');
	    throw err;
	}
    })
    connection.end();
} 
 // to delete a database 
var deleteTables= function(){
    var connection = mysql.createConnection(db_config);
    var sql = "SET FOREIGN_KEY_CHECKS = 0;" +
	      "DROP table if exists users; " + 
	      "drop table if exists photos; " +
	      "drop table if exists followship; " +
	      "drop table if exists stream; " +
	      "SET FOREIGN_KEY_CHECKS = 1;";

    connection.query(sql, function(err, results){
       if(err) 
	console.log(err);
   }); 
    connection.end();
}
//hand a connection lost. Recreate a connection
function handleDisconnect(){
    var connection = mysql.createConnection(db_config);

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
    var connection = mysql.createConnection(db_config);
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
    connection.end();
}
// add a user to the 'user' table, return UID if succeed,return uid, otherwise -1;
// @param  username 
// @param  fullname
// @param  password
// @param  joinDate: timestamp the data and time that the user register, format: 'YYYY-MM-DD HH:MM:SS'
// @output  if adding a user successfully, the data parameter in the callback is the uid, if user has alread existed, data is 0;
function addUser(username, full_name, password, ts, callback){
    var connection=mysql.createConnection(db_config);

    var sql = " INSERT INTO users (fullname, usrname, passwd, joinDate)" +
	      " SELECT * FROM ( SELECT ?, ?, ?, ? ) AS tmp " +
	      " WHERE NOT EXISTS ( " +
	      " SELECT usrname FROM users WHERE  usrname = ? " +
	      " ) LIMIT 1;";
    
    connection.query(sql, [full_name, username, pc.encrypt(password),ts,username],function(err, results){
	if(err)
	    throw err;
	else
	    callback(null, results.insertId);
    });
    connection.end();
}
//check a userID exist or not; If exist, the data in callback function is true, otherwise, false
function checkUserID(userID, callback){
    var connection = mysql.createConnection(db_config);

    var sql = 'SELECT * FROM users WHERE uid = ?';
    connection.query(sql, [userID], function (err, rows){
	if(err)
	    callback(err, null);
	else{
	    if(!_isEmpty(rows[0]))
		callback(null,true);
	    else
		callback(null, false);
	}
    });
    connection.end();
}
//Taking a user name as parameter and return its corresponding password to callback function
// the callback function: callback(err, passwd) passwd is 0, if no such userName
function getPassword(userName, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'SELECT passwd FROM users WHERE usrname =? ';
    connection.query(sql,[userName],function (err, rows){
	if(err){
	    callback(err, null);
	}
	else{
	    //console.log('userName is', userName);
	    //console.log(rows);
	    if(!_isEmpty(rows))
		callback(null, pc.decrypt(rows[0].passwd));
	    else
		callback(null, 0);
	}
    });
    connection.end();
}
//Check the provided password whether is belong to the user userName 
//callback(err, uid) If password and userName match, uid is the user's ID, otherwise, 0; When error happend, match is null;
//@param userID: a unsigned int
//@password: a string
function checkPassword(userName, password, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'SELECT passwd,uid FROM users WHERE usrName = ?';
    connection.query(sql, [userName], function(err, rows){
	if(err){
	    callback(err, null);
	}
	else{
	    if(_isEmpty(rows)){
		callback(null,0);
	    }
	    else{
		if(mysql.escape(pc.decrypt(rows[0].passwd)) == mysql.escape(password))
		    callback(null, rows[0].uid);
		else
		    callback(null, 0);
	    }
	}
    });
    connection.end();
}
// add a photo to the 'photos' table
// @param userId
// @param ts: timestampe, format : 'YYY-MM-DD HH:MM:SS'
// @param fname: photo's name
// @param callback: callback function, with two parameters, f(err, pid), 1st is err message and 2nd is photo id.
function addPhoto(userID,ts,fname, callback){
    var connection = mysql.createConnection(db_config);
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
    connection.end();
}
//add a path to a record with specified photo id, if succeeds, return 1, otherwise, return 0
function addPath(pid, path, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'UPDATE photos SET path = ? where pid = ?';
    connection.query(sql, [path, pid], function(err, results){
	if(err){
	    callback(err, 0);
	}
	callback(null, 1);
    })

    connection.end();
}
//delete a row with photo id as the input one. callback(err,data), if succeed in deleting, data is 1, otherwise, data is null;
function deletePhoto (userID, pid, callback){ 
    var connection = mysql.createConnection(db_config);
    var sql = "delete from stream where pid = ?;" +
	      "delete from photos where pid = ? and uid =?;";
    connection.query(sql, [pid, pid, userID], function (err){
	if(err)
	    callback(err,null);
	else
	    callback(err,1);
    //it seems that if not such pid, still returns 1;*****************************
    //********************************************
    });
	
    connection.end();
}
    
//get the storage path of a photo with ID as pid. Return PATAH if succeeds. otherwise, throw an error. 
function getPath(pid, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'SELECT path FROM photos WHERE pid = ?';
    connection.query(sql, [pid], function(err, rows){
	if(err){
	    callback(err,null);
	}
	else if(_isEmpty(rows))
		callback("No such pid",null);
	     else
		callback(null,rows[0].path);
    });

    connection.end();
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
//if a follower follows a followee succeeds, the data in callback is 1;
//if a follower has already followed a followee, the data in callback is 0;
//in other cases, data is null
function follow(followerID, followeeID, callback){
    var connection = mysql.createConnection(db_config);
    
    var sql =' INSERT INTO followship (flwr_id, flwe_id) '+
	     ' SELECT * FROM ( SELECT ?, ?) AS tmp ' +
	     ' WHERE NOT EXISTS ( ' +
	     '	    SELECT * FROM followship WHERE flwr_id =? and flwe_id = ? '+
	     ' ) LIMIT 1;';
    connection.query(sql, [followerID, followeeID, followerID, followeeID], function(err, res) {
	if (err)
	    callback(err, null);
	else{
	    if(res.affectedRows ==1)
		callback(null,1);
	    else
		callback(null,0);
	}
    });
    
    connection.end();
}


//if unFollow successfully, the data of callback(err,data) is 1;if they have no followship before, the data will be 0;
function unFollow(followerID, followeeID, callback){
    var connection = mysql.createConnection(db_config);

    var sql = 'DELETE FROM followship WHERE flwr_id = ? AND flwe_id =? ';

    connection.query(sql, [followerID, followeeID], function (err, results){
	if(err)
	    callback(err,null);
	else{
	    if(results.affectedRows)
		callback(null,1);
	    else
		callback(null,0);
	}
    });

    connection.end();
}

function addToStream(userID,photoID, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'INSERT INTO stream (uid, pid) VALUES (?, ?)';
    connection.query(sql, [userID, photoID], function(err, results){
	if(err){
	    callback(err);
	}
	else
	    callback(null);
    });

    connection.end();
}
function _deleteFromStream(photoID, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'DELETE FROM stream WHERE pid = ?';
    connection.query(sql, [photoID], function (err, results){
	if(err){
	    callback(err);
	}
	else
	    callback(null);
    });

    connection.end();
}
function _getFollower(followeeID, callback){
    var connection = mysql.createConnection(db_config);
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

    connection.end();
}
//return a user's feed   callback(err, photos)  photos is an object consisting of photos that should appear on the user's acnt
//Object photos has four field, (pid, path, name, timeStamp)
function getFeed(userID, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'SELECT photos.pid, photos.path, photos.name , photos.timeStamp FROM photos, stream WHERE ' +
	' photos.pid = stream.pid and stream.uid =? ORDER BY photos.pid DESC';
    connection.query(sql, [userID], function (err, rows){
	if(err)
	    callback(err, null);
	else{
	    callback(null, rows);
	}
    });

    connection.end();
}
//return information of photos uploaded by a user;
//input: user id
//output: a list of objects, each object has four fields (pid, name, path, timeStamp);
function getMyFeed(userID, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'SELECT pid, name, path, timeStamp FROM photos where uid = ? ORDER BY pid DESC';
    connection.query(sql, [userID], function (err, rows){
	if(err)
	    callback(err, null);
	else
	    callback(null, rows);
    });

    connection.end();
}
//check if followerId is following followeeID. If it is, return true, otherwise, return false;
function checkFollow(followerID, followeeID, callback) {
    var connection = mysql.createConnection(db_config);

    var sql = 'SELECT * FROM followship WHERE flwr_id = ? and flwe_id = ?';
    connection.query(sql, [followerID, followeeID], function (err, rows){
	if(err)
	    callback(err, null);
	else
	    if(_isEmpty(rows)){
		callback(null, false);
	    }else{
		callback(null, true);
	    }
    });
}
//funtion for testing
//insert a usert to the database
function _userInsert(uid, fullName, usrName, password) {
    var connection = mysql.createConnection(db_config);
    
    var sql = 'INSERT INTO users (uid, fullname, usrname, passwd) '+
	      'SELECT * FROM ( SELECT ?, ?, ?, ? ) AS tmp ' + 
	      'WHERE NOT EXISTS ( ' +
	      '	      SELECT usrname FROM users WHERE usrname = ? AND uid=? '+
	      ') LIMIT 1;';
    connection.query(sql, [uid, fullName, usrName, password, usrName, uid], function (err){
	if(err)
	    throw err;
    });
    connection.end();
}
//funtion for testing
//insert a photo to the database
function _photoInsert(fid, uid, ts, fname, path){
    var connection = mysql.createConnection(db_config);

    var sql = 'INSERT INTO photos (pid, uid, timeStamp, name, path) ' +
	      'SELECT * FROM ( SELECT ?, ?, ?, ?, ? ) AS tmp ' + 
	      'WHERE NOT EXISTS ( ' +
	      '	      SELECT pid FROM photos WHERE pid= ?'+
	      ') LIMIT 1;';
    
    connection.query(sql, [fid, uid,ts, fname, path], function (err) {
	if(err) throw err;
    });

    connection.end();
}
function getUserName(uid, callback){
    var connection = mysql.createConnection(db_config);
    var sql = 'SELECT usrname FROM users WHERE uid = ?;';

    connection.query(sql, [uid], function (err, rows){
	if (err)
	    callback(err, null);
	else if(_isEmpty(rows))
		callback('The id does not exist', null);
	    else
		callback(null, rows[0].usrname);
    });
    connection.end();
}
//share to a photo to one's followers
//@param uid, a user's id
//@param pid, a photo one wants to share
//@return if succeed in sharing, return 1; if no such photo, return 0; 
/*function sharePhoto(userID, photoID, callback) {
    var connection = mysql.createConnection(db_config);

    var sql = '

    connection.end();
}*/

module.exports.createTables = createTables;
module.exports.usr_is_exist = usr_is_exist;
module.exports.addUser = addUser;
module.exports.deleteTables = deleteTables;
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
module.exports.checkUserID = checkUserID;
module.exports._userInsert = _userInsert;
module.exports._photoInsert = _photoInsert;
module.exports.checkFollow = checkFollow;
module.exports.getUserName = getUserName;
