# SockMon
A management app for a sockbot instance. Great for hosting a permanent bot!

##Features
 - Friendly web page describing the bot and who to contact
 - Web-based admin to make managing the bot easier
 - Console-based admin as well

##How to run
- Install to the web server you want to run the bot
-  `npm start`


Console commands:
- `start`: Starts the server and bot both
- `pause`: Stops the bot, but leaves the server running
- `resume`: Starts the bot again after a pause
- `exit`: Stops the server and both both
- `set user`: Set the username for the admin web interface
- `set pass`: Set the password for the admin web interface
- `set config`: Set the config file for the bot

Web endpoints:
- `/`: Basic page listing bot info
- `/admin`: Admin page to administer the bot
- `/admin/pause`: see `pause` command
- `/admin/stop`: see `stop` command
- `/admin/resume`: see `resume` command
