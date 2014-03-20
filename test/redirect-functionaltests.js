var db = require('./db.js');
var expect = require('expect');
var app = require('./main.js');
//var app = require('express');
var request = require('supertest');
var should = require('should');

//var host = 'http://node.cs.ucalgary.ca:8500';

var user1 = {
	id : 1,
	login : 'Yao1',
	fullname : 'Yao',
	password : '123',
}
//var Cookies;
var cookie;
describe('redirect functional tests: ', function(){

	before(function(done){
		db.deleteTables();
		db.createTables();
		//db._userInsert(user1.id, user1.fullname, user1.login, user1.password);
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
	
	// describe('Functional Test <Sessions>:', function () {
		// it('should create user session for valid user', function (done) {
			// request(app).post('/users/create').set('Accept','application/json').send(user1).expect('Content-Type', /json/).expect(200).end(function (err, res) {
				// //res.params.id.should.equal('1');
				// //res.body.username.should.equal('Yao1');
				// //res.body.fullname.should.equal('Yao');
				// // Save the cookie to use it later to retrieve the session
				// Cookies = res.headers['set-cookie'].pop().split(';')[0];
				// done();
			// })
		// })
		
		// it('should get user session for current user', function (done) {
			// var req = request(app).get('/');
			// // Set cookie to get saved user session
			// req.cookies = Cookies;
			// req.set('Accept','application/json').expect('Content-Type', /json/).expect(200).end(function (err, res) {
				// //res.body.id.should.equal('1');
				// //res.body.login.should.equal('Yao1');
				// //res.body.fullname.should.equal('Yao');
				// done();
			// })
		// })
	// });


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

