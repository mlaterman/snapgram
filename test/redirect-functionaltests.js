//<<<<<<< HEAD
var db = require('./../db.js');
//var expect = require('expect');
//var app = require('./../main.js');
//var app = require('express');
//=======
//var db = require('./db.js');
//var app = require('./main.js');
//>>>>>>> 2989df1269508ca757c3cc05cbb39025833005fd
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
