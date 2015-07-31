var  bot = require("sockbot");
var botVersion = bot.version;
//var botConfigHelper = require('./node_modules/sockbot/config');
var Path = require('path');
var Hapi = require('hapi');
var storage = require('node-persist');
var bcrypt = require('bcryptjs');
var Basic = require('hapi-auth-basic');

var currCommand = "";
var server, stdin;

currConfig = "example.config.yml";

module.exports = {
	init: function() {
		stdin = process.openStdin();
		stdin.setEncoding( 'utf8' );
		stdin.on('data', module.exports.processInput);
		storage.initSync();

		//DEfault username password
		if (!storage.getItem('pass')) {
			storage.setItem('user',"SockMon");
			storage.setItem('pass', bcrypt.hashSync('Password'));
			module.exports.respond("WARNING! You have not configured a username and password. It has been set to SockMon/Password. PLEASE CHANGE THIS.");
		}
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
			else if (data.toLowerCase() === "config" | data.toLowerCase() === "set config") {
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
			else if(data.toLowerCase() === "set") {
				module.exports.respond("USAGE: Set [user|pass|config]");
			}
			else if(data.toLowerCase() === "set pass") {
				currCommand = "pass";
				module.exports.respond("Enter new password:");
			}
			else if(data.toLowerCase() === "set user") {
				currCommand = "user";
				module.exports.respond("Enter new password:");
			}
			else {
				module.exports.respond("Unknown command: '" + data.toLowerCase() + "'")
			}
		}

		else if (currCommand === "config") {
			currConfig = data;
			currCommand = "";
			console.log("Config file accepted.");
		}

		else if (currCommand === "pass") {
			storage.setItem('pass', bcrypt.hashSync(data));
			currCommand = "";
			module.exports.respond("Password changed.");
		}

		else if (currCommand === "user") {
			storage.setItem('user',data);
			currCommand = "";
			module.exports.respond("Username changed.");
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

		//Auth for admin route
		server.auth.strategy('simple', 'basic', { validateFunc: validate });

		// Add the routes
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

		server.route({
			method: 'GET',
			path:'/admin', 
			config: {
	            auth: 'simple',
	            handler: function (request, reply) {
					reply.view('index', {
						version: botVersion,
						username: botConfigHelper.core.username,
						owner: botConfigHelper.core.owner,
						forum: botConfigHelper.core.forum,
						plugins: Object.keys(botConfigHelper.plugins)
					});
				}
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

var validate = function (request, username, password, callback) {
    if (username !== storage.getItem('user')) {
        return callback(null, false);
    }

    bcrypt.compare(password, storage.getItem('pass'), function (err, isValid) {
        callback(err, isValid, {}); //We only have one user, we know who you are
    });
};

//Autostart
/* istanbul ignore if */
if(require.main === module) { 
	module.exports.init();
}