var db = require('./../db.js');
var expect = require('expect');

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
			expect(db.checkPassword).to.be.a('function');
		});
		//shallow equality check on return
		it('Login success: expects user1\'s id (1) on return', function(done) {
			db.checkPassword(user1.login, user1.password, function(err, val){
				expect(val).to.eql('1');
			});
			done();
		});
		//deep equality check on return
		it('Login success: expects user2\'s id (2) on return', function(done) {
			db.checkPassword(user2.login, user2.password, function(err, val) {
				expect(val).to.equal(2);
			});
			done();
		});
		//wrong password test
		it('Wrong password: expects value of 0 returned', function(done) {
			db.checkPassword(user1.login, user2.password, function(err, val) {
				expect(val).to.equal(0);
			});
			done();
		});
		//wrong password type test
		it('Wrong password (type): expects value of 0 returned', function(done) {
			db.checkPassword(user1.login, 1234, function(err, val) {
				expect(val).to.equal(0);
			});
			done();
		});
		//no such user test
		it('Non existent user: expects value of 0 returned', function(done) {
			db.checkPassword(user3.login, user3.password, function(err, val) {
				expect(val).to.equal(0);
			});
			done();
		});
		//wrong user type test
		it('Wrong user type: expects value of 0 returned', function(done) {
			db.checkPassword("bananas", "password3", function(err, val) {
				expect(val).to.equal(0);
			});
			done();
		});
		//wrong types test
		it('Wrong user & password: expects value of 0 returned', function(done) {
			db.checkPassword("bananas", 1234, function(err, val) {
				expect(val).to.equal(0);
			}
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
			expect(db.follow).to.be.a('function');
		});
		
		//make user 1 follow user 2
		it('User following a user: expects a value 1 indicating success', function(done) {
			db.follow(user1.id, user2.id, function(err, val) {
				expect(val).to.equal(1);
			});
			fExists = true;
			done();
		});
		//TODO: ensure test above is run before test below
		before(function(done) {
			if(fExists)
				done();
		});
		
		it('User followinng a user again: expects a zero as the realtionship exists already', function(done) {
			db.follow(user1.id, user2.id), function(err, val) {
				expect(val).to.equal(0);
			}
			done();
		});
		//make user 2 follow user 1
		it('Mutual Following: expects a 1', function(done) {
			db.follow(user2.id, user1.id, function(err, val) {
				expect(val).to.equal(1);
			});
			done();
		});
		//make user follow non existent user
		it('Follow non existent user: expects null return', function(done) {
			db.follow(user1.id, 10, function(err, val) {
				expect(val).to.be(null);
			});
			done();
		});
		//make user follow wrong type, using user 3 and true to check if
		//true gets mapped to 1
		it('Follow wrong type (boolean): expects null return', function(done) {
			db.follow(user3.id, true, function(err, val) {
				expect(val).to.be(null);
			});
			done();
		});
		//wrong type check again
		it('Follow wrong type (string): expects null return', function(done) {
			db.follow(user3.id, "bananas", function(err, val) {
				expect(val).to.be(null);
			});
			done();
		});
		//make non existent user follow user 1
		it('Non existing user follows existing user: expects null return', function(done) {
			db.follow(10, user1.id, function(err, val) {
				expect(val).to.be(null);
			});
			done();
		});
		//two non existent users follow each other
		it('Two non existen users follow each other: expect null return', function(done) {
			db.follow(10, 11, function(err, val) {
				expect(val).to.be(null);
			});
			done();
		});
	});
});
