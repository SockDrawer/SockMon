var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('async-eventemitter');
var sockMon = require('../index.js');

//dependencies to mock
var bot = require("sockbot");
var Hapi = require('hapi');

describe("The command-line parser", function() {
	var sandbox, mockCMD, processInputSpy, mockOut;

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
	})

	afterEach(function() {
		sandbox.restore();
	})

	it("should exit when asked", function(done) {
		var mockExit = sandbox.stub(process,"exit").returns();

		mockCMD.emit("data","exit", function() {
			assert(processInputSpy.called,"ProcessInput should be called");
			assert(mockExit.called,"Exit should be called");
			done();
		});

	});

	it("should start the server the first time it's asked", function(done) {
		var startServer = sandbox.stub(sockMon,"startServer");

		mockCMD.emit("data","start", function() {
			assert(processInputSpy.called,"ProcessInput should be called");
			assert(startServer.calledOnce,"StartServer shuld be called");
			done();
		});

	});

	it("should not start the server if it's already running", function(done) {
		var startServer = sandbox.spy(sockMon,"startServer");
		sandbox.stub(Hapi.Server.prototype,"start"); //don't actually start
		sandbox.stub(Hapi.Server.prototype,"route");

		mockCMD.emit("data","start", function() {
			mockCMD.emit("data","start", function() {
				sockMon.stopServer();
				assert(processInputSpy.calledTwice,"ProcessInput should be called");
				assert(startServer.calledOnce,"StartServer should be called only once");
				assert(mockOut.calledWith("Server already listening on port 8000!"),"output should render!");
				done();
			});
		});
	});

	it("should stop the server if it's running", function(done) {
		var stopServer = sandbox.spy(sockMon,"stopServer");
		sandbox.stub(Hapi.Server.prototype,"start"); //don't actually start
		sandbox.stub(Hapi.Server.prototype,"route");

		mockCMD.emit("data","start", function() {
			mockCMD.emit("data","stop", function() {
				assert(processInputSpy.calledTwice,"ProcessInput should be called");
				assert(stopServer.calledOnce,"StopServer should be called only once");
				done();
			});
		});
	});

	it("should not stop the server if it's not running", function(done) {
		var stopServer = sandbox.stub(sockMon,"stopServer");
		sandbox.stub(Hapi.Server.prototype,"start"); //don't actually start
		sandbox.stub(Hapi.Server.prototype,"route");

		mockCMD.emit("data","stop", function() {
			assert(processInputSpy.called,"ProcessInput should be called");
			assert.isFalse(stopServer.called,"StopServer should not be called");
			done();
		});
	});
})