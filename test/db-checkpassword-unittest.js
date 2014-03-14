var db = require('./../db.js');
var expect = require('expect');

var user1 = {
	id : '1',
	login : 'user1',
	fullname : 'user one',
	password : 'password1',
}
var user2 = {
	id : '2',
	login : 'user2',
	fullname : 'user two',
	password : 'password2',
}

describe('db-login', function() {
	it('should be able to access checkPassword', function() {
		expect(db.checkPassword).to.be.a('function');
	});
	
	//clear db, ensure 2 users are created
	before(function() {
		db.deleteTables();
		db.createTables();
		db._userInsert(user1.id, user1.fullname, user1.login, user1.password);
		db._userInsert(user2.id, user2.fullname, user2.login, user2.password);
	});
	//shallow equality check on return
	it('expects user1\'s id (1) on return', function() {
		expect(db.checkPassword(user1.login, user1.password)).to.eql('1');
	});
	//deep equality check on return
	it('expects user2\'s id (2) on return', function() {
		expect(db.checkPassword(user2.login, user2.password)).to.equal(2);
	});
	//wrong password test
	it('expects value of 0 returned', function() {
		expect(db.checkPassword(user1.login, user2.password)).to.equal(0);
	});
	//wrong password type test
	it('expects value of 0 returned', function() {
		expect(db.checkPassword(user1.login, 1234)).to.equal(0);
	});
	//no such user test
	it('expects value of 0 returned', function() {
		expect(db.checkPassword("user3", "password3")).to.equal(0);
	});
	//wrong user type test
	it('expects value of 0 returned', function() {
		expect(db.checkPassword(1234, "password3")).to.equal(0);
	});
});
