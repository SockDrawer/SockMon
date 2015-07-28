var  bot = require("sockbot");
var botVersion = bot.version;
var botConfigHelper = require('./node_modules/sockbot/config');
var Path = require('path');
var Hapi = require('hapi');

var currCommand = "";
var server;

var stdin = process.openStdin();
stdin.setEncoding( 'utf8' );
stdin.on('data', processInput);
console.log("Welcome to SockMon! You are currently configured to use the default config. If you want to get started, type 'start'. To change the config file, try 'config'. To exit, type 'exit'. ");

function processInput(data) {
	data = data.toString().trim();
	if (!currCommand) {
		if (data.toLowerCase() === "start") {
			if (!server) startServer();
			else console.log("Server already listening on port 8000!");
		} else if (data.toLowerCase() === "config") {
			currCommand = "config";
			console.log("Enter config file: ");
		} else if (data.toLowerCase() === "stop") {
			if (!server) console.log("Server is not running!");
			else stopServer();
		} else if (data.toLowerCase() === "exit") {
			console.log("Goodbye!");
			process.exit()
		} else {
			console.log("Unknown command: '" + data.toLowerCase() + "'")
		}
	}
}


function startServer()  {
	server = new Hapi.Server();
	server.connection({ 
		host: 'localhost', 
		port: 8000 
	});

	server.views({
		engines: {
			html: require('handlebars')
		},
		path: Path.join(__dirname, 'templates')
	});

	// Add the route
	server.route({
		method: 'GET',
		path:'/', 
		handler: function (request, reply) {
			reply.view('index', {
				version: botVersion,
				username: botConfigHelper.core.username,
				owner: botConfigHelper.core.owner,
				forum: botConfigHelper.core.forum,
				plugins: Object.keys(botConfigHelper.plugins)
			});
		}
	});

	// Start the server
	server.start();
	console.log("Server started! You can access it at localhost:8000");
}

function stopServer() {
	server.stop();
	server = null;
	console.log("Server stopped!");
}


// Create a server with a host and port
