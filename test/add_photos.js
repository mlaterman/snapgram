var fs = require('fs'),
    db = require('../db'),
    async = require('async');

var maxNum = 1000;

var finishedInsert = 0;
var uids = new Array();
for(var i =0; i<maxNum; ++i){
    uids[i]=i+1;
}

var q = async.queue(function(uid, callback){
        insertPhoto(uid, '1.jpg', function(err, res){
            if(err)
                throw err;
            callback(err,res);
        });
        insertPhoto(uid, '2.jpg', function(){
            callback(err,res);
        });
} ,1000);

q.drain = function(){
    console.log("Job done");
}



q.push(uids, function (err) {
    if (err)
        throw err;
    else
        console.log("Finished adding users");
});


function insertPhoto(uid, pname, callback){
     var date = new Date();
     var ts1 = date.getFullYear() +"-" + date.getMonth() + "-"+ date.getDate()+ " " + date.getHours() +":" + date.getMinutes()+ ":" + date.getSeconds();
    db.addPhoto(uid, ts1, pname, function(err, pid){
        if(err)
            callback(err, null);
        else{
            console.log("Add photo: ", pid);
            var path = "./photos/" + pid.toString()+".jpg";
            db.addPath(pid, path, function(val) {
            });
        }

    });

}
