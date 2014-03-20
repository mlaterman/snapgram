//var app = require('express');
var db = require('./../db.js');
var expect = require('expect');
var app = require('./../main.js');
var request = require('supertest');
var should = require('should');

var user1 = {
	id : 1,
	login : 'Yao1',
	fullname : 'Yao',
	password : '123',
}

describe('redirect functional tests: ', function(){

	before(function(done){
		db.deleteTables();
		db.createTables();
		//db._userInsert(user1.id, user1.fullname, user1.login, user1.password);
		request(app).post('/users/new').send(user1).expect(200,function(err,res){
			cookie = res.headers['Set-Cookie'];
			done();
		})

	})
	
	after(function(done){
		db.deleteTables();
		db.createTables();
		done();
	})
	
	
	describe('user homepage: ', function(){    
		it('user homepage', function (done) {
			request(app).get('/').set('cookie', cookie).expect(200,function(err,res){
				if(err) {
					if(res.status==302){
						//expect('1').to.not.be(1);
						//expect(res.header.location).not.to.be.empty();
						should.not.exist(res.header.location);
						done();
					}
					else{
						done(err);
					}
				} 
				else {
					//expect(res.header.location).to.not.be.empty();
					should.not.exist(res.header.location);
					done();
				}
			})
		})
	});

	describe('login page: ', function(){    
		it('login homepage', function (done) {
			request(app).get('/sessions/new').set('cookie', cookie).expect(200,function(err,res){
				if(err) {
					if(res.status==302){
						//expect('1').to.not.be(1);
						//expect(res.header.location).not.to.be.empty();
						res.header.location.should.equal('login');
						done();
					}
					else{
						done(err);
					}
				} 
				else {
					//expect(res.header.location).to.not.be.empty();
					res.header.location.should.equal('/feed');
					done();
				}
			})
		})
	});
	

})

