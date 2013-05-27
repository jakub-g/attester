var util = require('util');
var events = require("events");
var connect = require('connect');
var socketio = require('socket.io');
var http = require('./http-server.js');
var Logger = require('./logging/logger.js');
var ConsoleLogger = require('./logging/console-logger.js');
var SocketIOLogger = require('./logging/socketio-logger.js');


/*attester.taskFinished = function () {
    socket.emit('task-finished');
};*/

    
// =============================================================
   
var Slave = function (socket, data, konsole) {
    this.socket = socket;

    socket.on('task-finished', function(){
        konsole.log('Task finished');
    });
};
util.inherits(Slave, events.EventEmitter);

// =============================================================

var TestServer = function (logger) {

    this.logger = new Logger("TestServer", logger);
    var app = connect();
    app.use('/a', connect['static'](__dirname + '/client-xxx'));
    this.app = app;
    this.server = http.createServer(app);
    this.socketio = socketio.listen(this.server, {
        logger: new SocketIOLogger('socketio', this.logger)
    });
    this.socketio.set('client store expiration', 0);
    this.socketio.enable('browser client minification');
    this.socketio.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
    this.socketio.on('connection', function(socket){
        socket.once('hello', function (data) {
            if (data.type == 'slave') {
                console.log('Creating new slave');
                var newSlave = new Slave(socket, data, console);
            }
        });
    });
};

// =============================================================

var logger = new Logger("attester");
var consoleLogger = new ConsoleLogger(process.stdout);
consoleLogger.attach(logger);
    
// =============================================================

var testServer = new TestServer(logger);
testServer.server.listen("666", function () {
    console.log('server up and running');
});