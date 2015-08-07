var assert = require('chai').assert;
var sinon = require('sinon');
var EventEmitter = require('async-eventemitter');
var sockMon = require('../index.js');
var storage = require('node-persist');
var bcrypt = require('bcryptjs');

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

		 //don't actually start a web server, ever
		sandbox.stub(Hapi.Server.prototype,"start");
		sandbox.stub(Hapi.Server.prototype,"route");
	})

	afterEach(function() {
		sandbox.restore();
	})

	it("should be able to respond", function() {
		var mockConsole = sandbox.stub(console, "log");
		var string = "the quick brown fox jumps over the lazy dog";
		mockOut.restore();
		sockMon.respond(string);
		assert(mockConsole.called,"Console log should be called");
		assert.equal(mockConsole.firstCall.args[0],string);
	});

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
		var mockBot = sandbox.stub(bot,"start").yields(null);

		mockCMD.emit("data","start", function() {
			mockCMD.emit("data","start", function() {
				sockMon.stopServer();
				assert(processInputSpy.calledTwice,"ProcessInput should be called");
				assert(startServer.calledOnce,"StartServer should be called only once");
				assert(mockBot.calledOnce,"Bot should be started only once");
				assert(mockOut.calledWith("Server already listening on port 8000!"),"output should render!");
				done();
			});
		});
	});

	it("should stop the server if it's running", function(done) {
		var stopServer = sandbox.spy(sockMon,"stopServer");
		var mockBot = sandbox.stub(bot,"stop").yields(null);

		mockCMD.emit("data","start", function() {
			mockCMD.emit("data","stop", function() {
				assert(processInputSpy.calledTwice,"ProcessInput should be called");
				assert(stopServer.calledOnce,"StopServer should be called only once");
				assert(mockBot.calledOnce,"Bot should be stopped only once");
				done();
			});
		});
	});

	it("should not stop the server if it's not running", function(done) {
		var stopMock = sandbox.stub(sockMon,"stopBot").yields("bot stopped!");

		//ensure not running
		sockMon.stopServer(function() {
			var stopServer = sandbox.stub(sockMon,"stopServer");
			mockCMD.emit("data","stop", function() {
				assert(processInputSpy.called,"ProcessInput should be called");
				assert.isFalse(stopServer.called,"StopServer should not be called");
				done();
			});
		});

		
	});

	it("should reject garbage inputs", function(done) {
		var nonsense = "nananananananana BATMAN!";
		mockOut.reset();

		mockCMD.emit("data",nonsense, function() {
			assert(processInputSpy.called,"ProcessInput should be called");
			assert.equal(mockOut.firstCall.args[0],"Unknown command: '" + nonsense.toLowerCase() + "'");
			done();
		});
	});

	it("should change passwords", function(done) {
		var storageMock = sandbox.spy(storage,"setItem");

		mockCMD.emit("data","set pass", function() {
			mockCMD.emit("data","B4c0n", function() {
				assert(storageMock.called,"Storage should be involved");
				assert.equal("pass", storageMock.firstCall.args[0],"Pass should be updated");
				var encrypted = storageMock.firstCall.args[1];
				assert(bcrypt.compareSync("B4c0n", encrypted),"Correct password should be saved");
				done();
			});
		});
	});

	it("should change usernames", function(done) {
		var storageMock = sandbox.spy(storage,"setItem");

		mockCMD.emit("data","set user", function() {
			mockCMD.emit("data","eggs", function() {
				assert(storageMock.called,"Storage should be involved");
				assert.equal("user", storageMock.firstCall.args[0],"User should be updated");
				assert("eggs",storageMock.firstCall.args[1],"Correct username should be saved");
				done();
			});
		});
	});
	
	it("should set a default password", function() {
		var storageMockSet = sandbox.spy(storage,"setItem");
		var storageMockGet = sandbox.stub(storage,"getItem").returns("");
		sandbox.stub(storage, "initSync");
		sockMon.init();
		
		assert(storageMockGet.called,"Storage get should be called");
		assert(storageMockSet.called,"Storage set should be called");
		assert.equal("user", storageMockSet.firstCall.args[0],"User should be updated");
		assert.equal("pass", storageMockSet.secondCall.args[0],"Pass should be updated");
	});
	
	it("should change configs", function(done) {
		var storageMock = sandbox.spy(storage,"setItem");
		var mockBot = sandbox.stub(bot,"prepare").yields(null);
		mockOut.reset();
		
		mockCMD.emit("data","set config", function() {
			assert.equal(mockOut.firstCall.args[0],"Enter config file: ","Config command should be accepted");
			mockOut.reset();
			mockCMD.emit("data","someconfig.yml", function() {
				assert(mockBot.called)
				assert.equal(mockOut.firstCall.args[0],"Config file accepted.","Config file should be accepted");
				done();
			});
		});
	});

	it("should report config errors", function(done) {
		var storageMock = sandbox.spy(storage,"setItem");
		var mockBot = sandbox.stub(bot,"prepare").yields("I AM ERROR");
		mockOut.reset();
		
		mockCMD.emit("data","set config", function() {
			assert.equal(mockOut.firstCall.args[0],"Enter config file: ","Config command should be accepted");
			mockOut.reset();
			mockCMD.emit("data","someconfig.yml", function() {
				assert(mockBot.called)
				assert.equal(mockOut.firstCall.args[0],"Error changing config: I AM ERROR","Error should be reported");
				done();
			});
		});
	});
	
	it("should respond to 'set' with 'help'", function(done) {
		var storageMock = sandbox.spy(storage,"setItem");
		mockOut.reset();
		
		mockCMD.emit("data","set", function() {
			assert(mockOut.calledWith("USAGE: Set [user|pass|config]"));
			done();
		});
	});
	
	it("should be able to pause the bot if it's running", function(done) {
		var stopMock = sandbox.spy(sockMon,"stopBot");
		var mockBot = sandbox.stub(bot,"stop");
		sockMon.startBot();

		mockCMD.emit("data","pause", function() {
			assert(processInputSpy.calledOnce,"ProcessInput should be called");
			assert(stopMock.calledOnce,"StopBot should be called only once");
			assert(mockBot.calledOnce,"Bot should actually stop");
			done();
		});
	});
	
	it("should not be able to pause the bot if it's not running", function(done) {
		var stopMock = sandbox.spy(sockMon,"stopBot");
		var mockBot = sandbox.stub(bot,"stop");

		mockCMD.emit("data","pause", function() {
			assert(processInputSpy.calledOnce,"ProcessInput should be called");
			assert.isFalse(stopMock.called,"StopBot should not be called");
			assert.isFalse(mockBot.called,"Bot should not be stopped");
			done();
		});
	});

	it("should be able to resume a paused bot", function(done) {
		var stopMock = sandbox.spy(sockMon,"stopBot");
		var mockBotStop = sandbox.stub(bot,"stop");
		var mockBotStart = sandbox.stub(bot,"start");
		
		sockMon.startBot();
		var startMock = sandbox.spy(sockMon,"startBot");
		mockBotStop.reset();
		mockBotStart.reset();

		mockCMD.emit("data","pause", function() {
			mockCMD.emit("data","resume", function() {
				assert(processInputSpy.calledTwice,"ProcessInput should be called");
				assert(stopMock.calledOnce,"StopBot should be called only once");
				assert(startMock.calledOnce,"StartBot should be called only once");
				assert(mockBotStop.calledOnce,"Bot stop should be called only once");
				assert(mockBotStart.calledOnce,"Bot start should be called only once");
				done();
			});
		});
	});

	it("should not resume the bot if it's running", function(done) {
		var stopMock = sandbox.spy(sockMon,"stopBot");
		var mockBot = sandbox.stub(bot,"start");
		sockMon.startBot();
		mockBot.reset();

		mockCMD.emit("data","resume", function() {
			assert(processInputSpy.called,"ProcessInput should be called");
			assert.isFalse(stopMock.called,"StopBot should not be called");
			assert.isFalse(mockBot.called,"Bot should not be started again");
			done();
		});
	});
})

describe("The bot instance", function() {
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

	afterEach(function(done) {
		var mockBotStop = sandbox.stub(sockMon,"stopBot").yields(null);
		sockMon.stopServer(function(reply) {
			sandbox.restore();
			done();
		});
		
		
	})

	it("should start the bot when asked", function(done) {
		var mockBot = sandbox.stub(bot,"start").yields(null);

		sockMon.startBot(function(reply) {
			assert(mockBot.calledOnce,"Bot should be started");
			assert.equal(reply, "bot started!", "bot should be started")
			done();
		});
	});

	it("should pass along SockBot errors when starting", function(done) {
		var mockBot = sandbox.stub(bot,"start").yields("I AM ERROR");
		mockOut.reset();

		sockMon.startBot(function(reply) {
			assert(mockBot.calledOnce,"Bot should be started");
			assert.equal(reply, "ERROR starting bot: I AM ERROR", "error should be reported")
			done();
		});
	});

	it("should stop the bot if it's running", function(done) {
		var mockBot = sandbox.stub(bot,"stop").yields(null);

		sockMon.stopBot(function(reply) {
			assert(mockBot.calledOnce,"Bot should be stopped");
			assert.equal(reply, "bot stopped!", "bot should be stopped")
			done();
		});
	});

	it("should pass along SockBot errors when stopping", function(done) {
		var mockBot = sandbox.stub(bot,"stop").yields("I AM ERROR");
		mockOut.reset();

		sockMon.stopBot(function(reply) {
			assert(mockBot.calledOnce,"Bot should be stopped");
			assert.equal(reply, "ERROR stopping bot: I AM ERROR", "error should be reported")
			done();
		});
	});
})

describe("The web server", function() {
	var mockHapi;

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

		 //don't actually start a web server, ever
		sandbox.stub(Hapi.Server.prototype,"start");
		sandbox.stub(Hapi.Server.prototype,"stop");


		//or integrate with the bot
		sandbox.stub(sockMon,"startBot");
		sandbox.stub(sockMon,"stopBot").yields("stopped");
	})

	afterEach(function(done) {
		sandbox.restore();
		done();
	});

	it("should start the server when asked", function(done) {
		sockMon.startServer(function(reply) {
			assert(Hapi.Server.prototype.start.calledOnce,"server should be started");
			assert.equal(reply, "Server started! You can access it at localhost:8000", "server should be started")
			done();
		});
	});

	it("should stop the server if it's running", function(done) {
		sockMon.stopServer(function(reply) {
			assert(Hapi.Server.prototype.stop.calledOnce,"server should be stopped");
			assert.equal(reply, "stopped;Server stopped!", "server should be stopped")
			done();
		});
	});
})