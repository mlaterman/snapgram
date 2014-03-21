var db = require('./db.js');
var app = require('./main.js');
var request = require('supertest');
var should = require('should');

var user1 = {
	id : 1,
	login : 'Yao1',
	fullname : 'Yao',
	password : '123',
}
var cookie;

describe('redirect functional tests: ', function(){

	before(function(done){
		db.deleteTables();
		db.createTables();
		request(app).post('/users/create').send({'username': user1.login, 'password': user1.password, 'fullname': user1.fullname}).expect('Content-Type', /json/).expect(200,function(err,res){
			cookie = res.headers['set-cookie'];
			done();
		})
	})
	
	after(function(done){
		db.deleteTables();
		db.createTables();
		done();
	})

	describe('user login cookies test: ', function(){    
		it('user homepage with cookies', function (done) {
			request(app).get('/').set('cookie', cookie).expect('Content-Type', /json/).expect(200,function(err,res){
				res.header.location.should.be.equal('/feed');
				res.status.should.be.equal(302);
				done();
			})
		})
		
		it('user homepage without cookies', function (done) {
			request(app).get('/').expect(200,function(err,res){
				res.header.location.should.be.equal('/sessions/new');
				res.status.should.be.equal(302);
				done();
			})
		})
	});
	
	describe('feed cookies test: ', function(){    
		it('feed homepage with cookies', function (done) {
			request(app).get('/feed').set('cookie', cookie).expect('Content-Type', /json/).expect(200,function(err,res){
				done();
			})
		})
		
		it('feed homepage without cookies', function (done) {
			request(app).get('/feed').expect(302,function(err,res){
				res.header.location.should.be.equal('/sessions/new');
				done();
			})
		})
	});
});
