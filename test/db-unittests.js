var db = require('./../db.js');
var should = require('should');

var user1 = {
	id : 1,
	login : 'user1',
	fullname : 'user one',
	password : 'password1',
}
var user2 = {
	id : 2,
	login : 'user2',
	fullname : 'user two',
	password : 'password2',
}
var user3 = {
	id : 3,
	login : 'user3',
	fullname : 'user three',
	password : 'password3',
}

describe('database unit tests', function() {	
	//clear db, ensure 2 users are created
	before(function(done) {
		db.deleteTables();
		db.createTables();
		db._userInsert(user1.id, user1.fullname, user1.login, user1.password);
		db._userInsert(user2.id, user2.fullname, user2.login, user2.password);
		done();
	});
	//clean up after the second test
	after(function() {
		db.deleteTables();
		db.createTables();
	});
	
	describe('db.checkPassword', function() {
		it('should be able to access checkPassword', function() {
			db.checkPassword.should.be.Function;
		});
		//shallow equality check on return
		it('Login success: user1\'s id (1) should be return value', function(done) {
			db.checkPassword(user1.login, user1.password, function(err, val){
				val.should.eql('1');
			});
			done();
		});
		//deep equality check on return
		it('Login success: user2\'s id (2) should be return value', function(done) {
			db.checkPassword(user2.login, user2.password, function(err, val) {
				val.should.equal(2);
			});
			done();
		});
		//wrong password test
		it('Wrong password: should return 0', function(done) {
			db.checkPassword(user1.login, user2.password, function(err, val) {
				val.should.equal(0);
			});
			done();
		});
		//wrong password type test
		it('Wrong password (type): should return 0', function(done) {
			db.checkPassword(user1.login, 1234, function(err, val) {
				val.should.equal(0);
			});
			done();
		});
		//no such user test
		it('Non existent user: should return 0', function(done) {
			db.checkPassword(user3.login, user3.password, function(err, val) {
				val.should.equal(0);
			});
			done();
		});
		//wrong user type test
		it('Wrong user type: should return 0', function(done) {
			db.checkPassword("bananas", "password3", function(err, val) {
				val.should.equal(0);
			});
			done();
		});
		//wrong types test
		it('Wrong user & password: should return 0', function(done) {
			db.checkPassword("bananas", 1234, function(err, val) {
				if(err)
					should.fail(err);
				val.should.equal(0);
			});
			done();
		});
	});

	describe('db.follows', function() {
		var fExists = false;
		
		before(function(done) {
			db._userInsert(user3.id, user3.fullname, user3.login, user3.password);
			done();
		});
		
		it('should be able to access follow', function() {
			db.follow.should.be.Function;
		});
		
		//make user 1 follow user 2
		it('User following a user: should return 1 indicating success', function(done) {
			db.follow(user1.id, user2.id, function(err, val) {
				val.should.equal(1);
			});
			fExists = true;
			done();
		});
		
		it('User followinng a user again: should return 0 as the realtionship exists already', function(done) {
			db.follow(user1.id, user2.id), function(err, val) {
				val.should.equal(0);
			}
			done();
		});
		//make user 2 follow user 1
		it('Mutual Following: should return 1', function(done) {
			db.follow(user2.id, user1.id, function(err, val) {
				val.should.equal(1);
			});
			done();
		});
		//make user follow non existent user
		it('Follow non existent user: should return null', function(done) {
			db.follow(user1.id, 10, function(err, val) {
				should.not.exist(val);
			});
			done();
		});
		//make user follow wrong type, using user 3 and true to check if
		//true gets mapped to 1
		it('Follow wrong type (boolean): should return null', function(done) {
			db.follow(user3.id, true, function(err, val) {
				should.not.exist(val);
			});
			done();
		});
		//wrong type check again
		it('Follow wrong type (string): should return null', function(done) {
			db.follow(user3.id, "bananas", function(err, val) {
				should.not.exist(val);
			});
			done();
		});
		//make non existent user follow user 1
		it('Non existing user follows existing user: should return null', function(done) {
			db.follow(10, user1.id, function(err, val) {
				should.not.exist(val);
			});
			done();
		});
		//two non existent users follow each other
		it('Two non existen users follow each other: should return null', function(done) {
			db.follow(10, 11, function(err, val) {
				should.not.exist(val);
			});
			done();
		});
	});
});
