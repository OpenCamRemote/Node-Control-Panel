// Import Libraries
const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server);

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { autoDetect } = require('@serialport/bindings-cpp'); 
const binding = autoDetect();

const os = require("os");

const ascii_text_generator = require('ascii-text-generator');

const chalk = require('chalk');

const { Command, Option } = require('commander');
const program = new Command();

var term = require('terminal-control').init().autoClean();

// Get command line parameters
program.addOption(new Option('-p, --port <number>', 'port to use for web server and socket.io')
							.default(80)
							.env('PORT')
							.argParser(parseFloat));
program.parse();
const options = program.opts();

// Clear terminal
term.clearScreen();
term.moveCursorToUpperLeft();

// Find Arduino
binding.list()
	.then(ports => {
		const port = ports.find(port => /arduino/i.test(port.manufacturer));
		if (!port) {
			console.error('OpenCamRemote Controller Not found');
			process.exit(1);
		}
		console.log('Found controller at', chalk.magenta(port.path));
		
// Connect to serial port
const serial = new SerialPort({ path: port.path, baudRate: 9600 });
const parser = serial.pipe(new ReadlineParser({ delimiter: '\n' }));

// Event for serial input
parser.on('data', data =>{
	// Home?
	if(data.includes('home')){
		// Yes
		home();
	}
	// Yes or no
	console.log('Data:', data)
});

// Create/set variables
var pan = 0;
var tilt = 0;

var panhome = 90;
var tilthome = 90;

// Serve main page
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

// Socket.io setup
io.on('connection', (socket) => {
	// Handle input
	socket.on('pan', (msg) => {
		pan = msg;
		serialUpdate();
		socket.broadcast.emit('pan', msg);
	});
	socket.on('tilt', (msg) => {
		tilt = msg;
		serialUpdate();
		socket.broadcast.emit('tilt', msg);
	});
	socket.on('home', (msg) => {
		home();
	});
	
	// Broadcast current value on new connection
	socket.emit('pan', pan);
	socket.emit('tilt', tilt);
});

// Start http server
server.listen(options.port, () => {
	// Print the fancy status text
	console.log('listening on *:'+chalk.yellow(options.port));
	console.log('hostname is', chalk.magenta(os.hostname()));
	console.log(chalk.red(ascii_text_generator('OPEN','2')));
	console.log(chalk.green(ascii_text_generator('CAM','2')));
	console.log(chalk.blue(ascii_text_generator('REMOTE','2')));
	console.log('v'+chalk.cyan(process.env.npm_package_version));
});

// Send new values when serialUpdate is called
function serialUpdate() {
	serial.write('<'+pan+','+tilt+'>\n', (err) => {
		if (err) {
			return console.log('Error on write: ', err.message);
		}
	});
}

// Handle pressing 'Home' button
function home() {
	pan = panhome;
	tilt = tilthome;
	serialUpdate();
	io.emit('home', true);
	io.emit('pan', pan);
	io.emit('tilt', tilt);
}
}); // Found arduino
