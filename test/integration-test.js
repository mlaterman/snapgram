var request = require('supertest');
var should = require('should');

/*
 * A sample user session, a user gets redirected to the log in page,
 * makes a new account, uploads an image and views it on the feed before
 * logging out.
 * 
 * Test one: make a requests and check if there is a redirect to the
 * 			 login page, request the sign up page
 * test two: Create a new account, check that the response is a redirect
 * 			 to feed and store the cookie
 * test three: upload an image and see that it appears in feed
 * test four: logout redirection
 */ 
 
var integrationUser = {
	fullname : 'integration user',
	username : 'iuser',
	password : 'iuser'
};
var cookie;
var image = '../photos/test1.jpg';
var fname = 'test.jpg';
request = request('node.cs.ucalgary.ca:8500');

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
	before(function(done) {
		request.post('/photos/create').set('cookie', cookie).attach('image', image, fname).expect(302, done());
	});
	it('should see an image in the feed', function(done) {
		request.get('/feed').set('cookie', cookie).expect(200, function(err, res) {
			res.text.should.containEql('img');
			done()
		});
	});
});

describe('logging out after test', function() {
	it('should redirect on logout', function(done) {
		request.get('/logout').set('cookie', cookie).expect(302, done());
	});
});
