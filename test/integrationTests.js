var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('async-eventemitter');
var sockMon = require('../index.js');
var request = require('request');
var storage = require('node-persist');
var bcrypt = require('bcryptjs');

//dependencies to mock
var bot = require("sockbot");
var Hapi = require('hapi');

describe("The website", function() {
	var sandbox;
	
	beforeEach(function() {
		sandbox = sinon.sandbox.create();
		mockCMD = new EventEmitter();
		mockCMD.setEncoding = function() {};
		processInputSpy = sandbox.spy(sockMon, "processInput");

		//Very briefly mock out process.openstdin, then restore it
		var mockOpen = sandbox.stub(process,"openStdin").returns(mockCMD);
		//Also shut up the console
		mockOut = sandbox.stub(sockMon,"respond");
		sockMon.init();
		mockOpen.restore();
	});
	
	afterEach(function(done) {
		sockMon.stopServer(function() {
			sandbox.restore();
			done();
		});
		
	});
	
	it("should serve a page", function(done) {
		mockCMD.emit("data","start", function() {
			request('http://localhost:8000', function (error, response, body) {
				assert.notOk(error, "No error should be thrown");
				assert.equal(200, response.statusCode, "status code should be 200");
				done();
			});
		});
	});
	
	it("should serve an admin page if authorized", function(done) {
		var storageMockGet = sandbox.stub(storage,"getItem").withArgs("user").returns("Jotaro").withArgs("pass").returns(bcrypt.hashSync("adventure"));
		
		mockCMD.emit("data","start", function() {
			request('http://localhost:8000/admin', function (error, response, body) {
				assert.notOk(error, "No error should be thrown");
				assert.equal(200, response.statusCode, "status code should be 200");
				done();
			}).auth('Jotaro', 'adventure');
		});
	});
	
	it("should not serve an admin page if unauthorized", function(done) {
		var storageMockGet = sandbox.stub(storage,"getItem").withArgs("user").returns("Jotaro").withArgs("pass").returns(bcrypt.hashSync("adventure"));
		
		mockCMD.emit("data","start", function() {
			request('http://localhost:8000/admin', function (error, response, body) {
				assert.notOk(error, "No error should be thrown");
				assert.equal(401, response.statusCode, "status code should be 401");
				done();
			})
		});
	});
	
	it("should not serve an admin page if wrong username", function(done) {
		var storageMockGet = sandbox.stub(storage,"getItem").withArgs("user").returns("Jotaro").withArgs("pass").returns(bcrypt.hashSync("adventure"));
		
		mockCMD.emit("data","start", function() {
			request('http://localhost:8000/admin', function (error, response, body) {
				assert.notOk(error, "No error should be thrown");
				assert.equal(401, response.statusCode, "status code should be 401");
				done();
			}).auth('Joseph', 'adventure');
		});
	});
	
	it("should not serve an admin page if wrong password", function(done) {
		var storageMockGet = sandbox.stub(storage,"getItem").withArgs("user").returns("Jotaro").withArgs("pass").returns(bcrypt.hashSync("adventure"));
		
		mockCMD.emit("data","start", function() {
			request('http://localhost:8000/admin', function (error, response, body) {
				assert.notOk(error, "No error should be thrown");
				assert.equal(401, response.statusCode, "status code should be 401");
				done();
			}).auth('Jotaro', 'Bizzarre');
		});
	});
	
	it("should pause the bot if authorized", function(done) {
		var storageMockGet = sandbox.stub(storage,"getItem").withArgs("user").returns("Jotaro").withArgs("pass").returns(bcrypt.hashSync("adventure"));
		
		mockCMD.emit("data","start", function() {
			request('http://localhost:8000/admin/pause', function (error, response, body) {
				assert.notOk(error, "No error should be thrown");
				assert.equal(200, response.statusCode, "status code should be 200");
				assert.equal(body, "bot stopped!", "Bot should be stopped");
				done();
			}).auth('Jotaro', 'adventure');
		});
	});
	
	it("should resume the bot if paused", function(done) {
		var storageMockGet = sandbox.stub(storage,"getItem").withArgs("user").returns("Jotaro").withArgs("pass").returns(bcrypt.hashSync("adventure"));
		
		mockCMD.emit("data","start", function() {
			sockMon.stopBot();
			request('http://localhost:8000/admin/resume', function (error, response, body) {
				assert.notOk(error, "No error should be thrown");
				assert.equal(200, response.statusCode, "status code should be 200");
				assert.equal(body, "bot started!", "Bot should be started");
				done();
			}).auth('Jotaro', 'adventure');
		});
	});
	
	it("should stop the server if authorized", function(done) {
		var storageMockGet = sandbox.stub(storage,"getItem").withArgs("user").returns("Jotaro").withArgs("pass").returns(bcrypt.hashSync("adventure"));
		
		mockCMD.emit("data","start", function() {
			request('http://localhost:8000/admin/stop', function (error, response, body) {
				assert.notOk(error, "No error should be thrown");
				assert.equal(200, response.statusCode, "status code should be 200");
				assert.equal(body, "bot stopped!;Server stopped!", "Server should be stopped");
				done();
			}).auth('Jotaro', 'adventure');
		});
	});
});