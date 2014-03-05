var db = require('./db');


db.createDb();
db.addUser('yao', 'yao Zhao', 'password','1991-01-08 00:11:22', function(err, data){
    if(err) 
	console.log(err)
    if(data>0){
	console.log('Add a user successfully')
	console.log('UID is', data);
    }
    else if (data == -1)
	console.log("user alread existed")
    else 
	console.log("Error happens");
});
db.getPassword('yao', function(err, passwd){
    if(err)
	console.log(err);
    else
	console.log("Your passwd is ", passwd);
});

db.addPhoto(8,'2013-08-05 00:13:45','lab.jpg', function(err, pid){
    if(err)
	console.log(err);
    else
	console.log('Photo id is ', pid);
});

db.addPath(1, '/home/yao/photos', function(err){
    if(err)
	console.log(err);
    else
	console.log('succeed');
});
db.getPath(1, function(err, path){
    if(err)
	console.log(err);
    else
	console.log('path is ', path);
});
db.addUser('Yang', 'Yang Liu', 'hihi', '2000-11-22 05:23:20', function(err, data){
    if(err)
	console.log(err)
    if(data > 0){
	console.log('Add Yang successfully');
	console.log('UID is ', data);
    }
    else if(data ==-1)
	console.log('Yang alread existed');
    else
	console.log('Error happened');
});
db.follow(9,8, function(err){
    if(err)
	console.log('unable to follow a person');
    else
	console.log('Succeed in following other');
});

/*db.unFollow(9,8, function(err){
    if(err)
	console.log('unable to unfollow a person');
    else
	console.log('Unfollowed');
});
*/

//db.closeDb();
