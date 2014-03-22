// to add followers and followees for each users
// To simplify the test, we assume that User i follows users with id ranging from [(i+1)%1000, (i+n)%1000];
// 1000 here is the total number of users in the database; n is a user's follower number
// we test the scenario of n as [1, 3, 5, 10, 20]
// NOTE: to run this program, you must run add_testing_users.js first to initilize the database;
var db = require('../db');

var n = 8;
var flwerNum = [1, 3, 5, 10, 20];

var totalUsers = 1000;

for (var i=1; i<=totalUsers;++i){
    for(var j = 1; j<=n;++j){
        var follower = i;
        var followee = (follower+j)%totalUsers==0 ? totalUsers: (follower+j)%totalUsers;
        console.log('add ', follower.toString(), ' to ', followee.toString());
        db.follow(follower, followee, function (err, res) {
            if(err)
                throw err;
        });
    }
}

