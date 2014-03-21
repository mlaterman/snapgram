/*  Redirect Functional tests
This test file calles some funcions in the db.js. Therefore make sure the test file is put into the test folder of snapgram.
The server should run the node snapgram on port 8500.
This program tests the following 4 conditions:
1) Send the request to '/' with cookies: should be redirected to '/sessions/new'
2) Send the request to '/' without cookies: should be redirected to '/feed'
3) Send the request to '/feed' with cookies: should show the feed content
4) Send the request to '/feed' without cookies: should be redirected to '/sessions/new'

*/
//********************************************************************
var db = require('./../db.js');
var request = require('supertest');
var should = require('should');

var integrationUser = {
	fullname : 'integration user',
	username : 'iuser',
	password : 'iuser'
};

var cookie;
request = request('node.cs.ucalgary.ca:8500');

describe('redirect functional tests: ', function(){

	before(function(done){
		db.deleteTables();
		db.createTables();
		request.post('/users/create').send({'fullname': integrationUser.fullname, 'username': integrationUser.username, 'password': integrationUser.password}).expect(302,function(err,res){
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
			request.get('/').set('cookie', cookie).expect(200,function(err,res){
				res.header.location.should.be.equal('/feed');
				res.status.should.be.equal(302);
				done();
			})
		})
		
		it('user homepage without cookies', function (done) {
			request.get('/').expect(200,function(err,res){
				res.header.location.should.be.equal('/sessions/new');
				res.status.should.be.equal(302);
				done();
			})
		})
	});
	
	describe('feed cookies test: ', function(){    
		it('feed homepage with cookies', function (done) {
			request.get('/feed').set('cookie', cookie).expect(200,function(err,res){
				done();
			})
		})
		
		it('feed homepage without cookies', function (done) {
			request.get('/feed').expect(302,function(err,res){
				res.header.location.should.be.equal('/sessions/new');
				done();
			})
		})
	});
});
