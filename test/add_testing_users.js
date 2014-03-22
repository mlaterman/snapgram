// this program is used to add 2000 users for testing
// Each users has two photos but no any followers or followees
// to be used for testing concurrent request and response time. 

var db = require('../db');
var fs = require('fs'),
    async = require('async');


var maxNum = 1000;

async.series([
    function(callback){
        db.deleteTables();
        callback(null, 'delete tables done');
    },
    function(callback){
        db.createTables();
        callback(null, 'create tables done');
    },
    function(callback){
        for(var i =1; i <= maxNum; ++i){
            db.addUser(i.toString(), '**', i.toString(), '2014-03-17 19:10:11', function(err, id){
                if(err)
                    console.log(err);
                else
                    console.log('Add user: ', id);
            });
        }
    },
    /*function(callback){
        console.log("hi");
    },
    function(callback){
        console.log('why not work?');
        insertPhotos(maxNum, 2, function(){})
    }*/
],
    function(err, results){
        if(err)
            throw err;
        else{
            console.log(results[0]);
            console.log(resutls[1]);
        }
    }
);

//delete all existing tables


function sleep(milliseconds){
    var date1 = new Date();
    var date2 = new Date();
    while(date2 - date1< milliseconds){
        data2 = new Date();
    }
}

function insertPhotos(total,maxConcurrentInsert, callback){
    var runningInsert = 0,
        startedInsert = 0,
        finishedInsert = 0;

        function next() {
            runningInsert--;
            finishedInsert++;

            if(finishedInsert == total){
                callback();
            }
            else{
                queue();
            }
        }

        function queue() {
            while(startedInsert < total && runningInsert < maxConcurrentInsert){
                runningInsert++;
                //do something here
                var date = new Date();
                var ts1 = date.getFullYear() +"-" + date.getMonth() + "-"+ date.getDate()+ " " + date.getHours() +":" + date.getMinutes()+ ":" + date.getSeconds();
                db.addPhoto(++startedInsert, ts1,'test1.jpg', function(err, pid){
                    if(err)
                        throw err;
                    else{
                        console.log("Add photo: ", pid);
                        var fStream = fs.createReadStream('../photos/test1.jpg');
                        var path ='../photos/'+  pid.toString() + '.jpg'
                        var oStream = fs.createWriteStream(path);
                        fStream.pipe(oStream, {end : false});
                        fStream.on('end', function() {
                            db.addPath(pid, path, function(val) {
                                if(val == 0) {//error updateing path on server
                                    db.deletePhoto(i.toString(), pid, function(e){});
                                    fs.unlink(path, function(e){});
                                }
                            });
                            next();
                        }); 
                    }

                });
            }
        }

        // start running
        queue();
}

