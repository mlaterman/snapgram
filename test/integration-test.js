var expect = require('expect.js');
var http = require('http');

var opts = {
	host : 'node.cs.ucalgary.ca',
	port : 8500,
	method : '',
	path : ''
};
var integrationUser = {
	fname : 'integration user',
	login : 'iuser',
	password : 'iuser'
};

/*
 * A series of requests to test various components of the application;
 * Test one: make a request and check if there is a redirect to the login page
 * test two: make a request to get the user sign up page, then create an account
 * 			 and see that there is a redirect to /feed
 * test three: upload an image and see that it appears in feed
 */ 
describe('A check for redirection when not logged in and account creation page is served sucessfully', function() {
	it('Expects to be redirected to /sessions/new', function(done) {
		opts.path = '/';
		opts.method = 'GET';
		var req = http.request(opts);
		req.on('response', function(res) {
			req.on('data', function(chunk) {});
			req.on('end', function() {
				expect(res.statusCode).to.equal('302');
				expect(res.headers).to.contain('/session/new');
				done();
			});
		});
		req.on('error', function(err) {
			expect().fail("Error with http response");
			done();
		});
		req.end();
	});
	it('Expects the sign up form to be returned', function(done) {
		opts.path = '/users/new';
		opts.method = 'GET';
		var req = http.request(opts);
		req.on('response', function(res) {
			req.on('data', function(chunk) {});
			req.on('end', function() {
				expect(res.statusCode).to.equal('200');
				expect(res.headers).to.contain('Sign Up');//TODO: better expect here
				done();
			});
		});
		req.on('error', function(err) {
			expect().fail("Error with http response");
			done();
		});
		req.end();
	});
});
/*
describe('A test for account creation and proper response', function() {
	it('Expects a cookie to be returned and a redirect to /feed', function(done) {
		opts.path = '/users/create';
		opts.method = 'POST';
		var req = http.request(opts);
		req.on('response', function(res) {
			req.on('data', function(chunk) {});
			req.on('end', function() {
				expect(res.statusCode).to.equal('302');
				expect(res.headers).to.contain('/feed');
				expect(res).to.contain('sid'); //TODO: make sure this checks for the cookie
				done();
			});
		});
		req.on('error', function(err) {
			expect().fail("Error with http response");
			done();
		});
		//TODO: write body here
		req.end();
	});
});
*/
