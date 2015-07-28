var bot = require("sockbot");
var botVersion = bot.version;
var botConfigHelper = require('./node_modules/sockbot/config');
var Path = require('path');

var Hapi = require('hapi');

// Create a server with a host and port
var server = new Hapi.Server();
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
//bot.start();
server.start();