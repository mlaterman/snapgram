var request = require('supertest');
var should = require('should');

var integrationUser = {
	fullname : 'integration user',
	username : 'iuser',
	password : 'iuser'
};
var cookie;

request = request('node.cs.ucalgary.ca:8500');
/*
 * A series of requests to test various components of the application;
 * Test one: make a request and check if there is a redirect to the login page
 * test two: make a request to get the user sign up page, then create an account
 * 			 and see that there is a redirect to /feed
 * test three: upload an image and see that it appears in feed
 */ 
describe('A check for redirection when not logged in and account creation page is served sucessfully', function() {
	it('Expects to be redirected to /sessions/new', function(done) {
		request.get('/').expect(302, done());
	});
	it('Expects the sign up form to be returned', function(done) {
		request.get('/users/new').expect(200, done());
	});
});

describe('A test for account creation and proper response', function() {
	it('Expects a cookie to be returned and a redirect to /feed', function(done) {
		request.post('/users/create').send(integrationUser).expect(302, function(err, res){
			res.headers.location.should.equal('/feed');
			cookie = res.headers['set-cookie'];
			done();
		});
	});
});

describe('Upload an image and view the feed afterwards', function() {
	it('should be able to see an image in the feed', function(done) {
		request.post('/photos/create').set('cookie', cookie).attach('image', './photos/test1.jpg').expect('Location', '/feed').expect(302, done());
		request.get('/feed').set('cookie', cookie).expect(200, function(err, res) {
			res.body.should.containEql('img');
			done()
		});
	});
});

describe('logging out after test', function() {
	it('should redirect on logout', function(done) {
		request.get('/logout').set('cookie', cookie).expect(302, done());
	});
});
