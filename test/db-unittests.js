var db = require('./../db.js');
var should = require('should');

/*
 * A series of tests that tests the db.checkPassword function used for login
 * and the db.follow function used to follow a user, database is set then
 * cleaned after these tests
 * 
 * db.CheckPassword
 * 	ensure that function is accessable
 * 	login checks with both shallow and deep assertions
 * 	wrong password/password type tests
 * 	no user test, wrong user type test
 * 	wron user/password case
 * 
 * db.follow
 * 	insert another user and check that follows is accessible
 * 	ensure that a user can only follow another user once (repeated follows
 * 		without unfollowing will fail)
 * 	mutual following
 * 	wrong type tests
 * 	nonexisten user cases
 */ 
 
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
	before(function(done) {
		db.deleteTables();
		db.createTables();
		db._userInsert(user1.id, user1.fullname, user1.login, user1.password);
		db._userInsert(user2.id, user2.fullname, user2.login, user2.password);
		done();
	});
	
	after(function() {
		db.deleteTables();
		db.createTables();
	});
	
	describe('db.checkPassword', function() {
		it('should be able to access checkPassword', function() {
			db.checkPassword.should.be.Function;
		});

		it('Login success: user1\'s id (1) should be return value', function(done) {
			db.checkPassword(user1.login, user1.password, function(err, val){
				val.should.eql('1');
			});
			done();
		});

		it('Login success: user2\'s id (2) should be return value', function(done) {
			db.checkPassword(user2.login, user2.password, function(err, val) {
				val.should.equal(2);
			});
			done();
		});

		it('Wrong password: should return 0', function(done) {
			db.checkPassword(user1.login, user2.password, function(err, val) {
				val.should.equal(0);
			});
			done();
		});

		it('Wrong password (type): should return 0', function(done) {
			db.checkPassword(user1.login, 1234, function(err, val) {
				val.should.equal(0);
			});
			done();
		});

		it('Non existent user: should return 0', function(done) {
			db.checkPassword(user3.login, user3.password, function(err, val) {
				val.should.equal(0);
			});
			done();
		});

		it('Wrong user type: should return 0', function(done) {
			db.checkPassword("bananas", "password3", function(err, val) {
				val.should.equal(0);
			});
			done();
		});

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
		before(function(done) {
			db._userInsert(user3.id, user3.fullname, user3.login, user3.password);
			done();
		});
		
		it('should be able to access follow', function() {
			db.follow.should.be.Function;
		});

		it('User following a user: should return 1 indicating success', function(done) {
			db.follow(user1.id, user2.id, function(err, val) {
				val.should.equal(1);
			});
			done();
		});
		
		it('User followinng a user again: should return 0 as the realtionship exists already', function(done) {
			db.follow(user1.id, user2.id), function(err, val) {
				val.should.equal(0);
			}
			done();
		});

		it('Mutual Following: should return 1', function(done) {
			db.follow(user2.id, user1.id, function(err, val) {
				val.should.equal(1);
			});
			done();
		});

		it('Follow non existent user: should return null', function(done) {
			db.follow(user1.id, 10, function(err, val) {
				should.not.exist(val);
			});
			done();
		});

		it('Follow wrong type (boolean): should return null', function(done) {
			db.follow(user3.id, true, function(err, val) {
				should.not.exist(val);
			});
			done();
		});

		it('Follow wrong type (string): should return null', function(done) {
			db.follow(user3.id, "bananas", function(err, val) {
				should.not.exist(val);
			});
			done();
		});

		it('Non existing user follows existing user: should return null', function(done) {
			db.follow(10, user1.id, function(err, val) {
				should.not.exist(val);
			});
			done();
		});

		it('Two non existen users follow each other: should return null', function(done) {
			db.follow(10, 11, function(err, val) {
				should.not.exist(val);
			});
			done();
		});
	});
});
