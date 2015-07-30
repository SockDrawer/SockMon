var  bot = require("sockbot");
var botVersion = bot.version;
//var botConfigHelper = require('./node_modules/sockbot/config');
var Path = require('path');
var Hapi = require('hapi');

var currCommand = "";
var server, stdin;


module.exports = {
	init: function() {
		stdin = process.openStdin();
		stdin.setEncoding( 'utf8' );
		stdin.on('data', module.exports.processInput);
		this.respond("Welcome to SockMon! You are currently configured to use the default config. If you want to get started, type 'start'. To change the config file, try 'config'. To exit, type 'exit'. ");

	},

	respond: function(text) {
		console.log(text);
	},

	processInput: function(data) {
		data = data.toString().trim();
		if (!currCommand) {
			if (data.toLowerCase() === "start") {
				if (!server) module.exports.startServer();
				else module.exports.respond("Server already listening on port 8000!");
			} 
			else if (data.toLowerCase() === "config") {
				currCommand = "config";
				module.exports.respond("Enter config file: ");
			} 
			else if (data.toLowerCase() === "stop") {
				if (!server) module.exports.respond("Server is not running!");
				else module.exports.stopServer();
			} 
			else if (data.toLowerCase() === "exit") {
				module.exports.respond("Goodbye!");
				process.exit();
			} 
			else {
				module.exports.respond("Unknown command: '" + data.toLowerCase() + "'")
			}
		}
	},

	startServer: function() {
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
		this.respond("Server started! You can access it at localhost:8000");
	},
	stopServer: function() {
		server.stop();
		server = null;
		this.respond("Server stopped!");
	}
}

//Autostart
/* istanbul ignore if */
if(require.main === module) { 
	module.exports.init();
}