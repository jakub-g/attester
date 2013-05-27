
(function () {
    var window = this;
    var location = window.location;

    var attester = {};
    window.attester = attester;
    attester.taskFinished = function () {
        socket.emit('task-finished');
    };

    var socket = io.connect(location.protocol + '//' + location.host, {
        'reconnection delay': 500,
        'reconnection limit': 2000,
        'max reconnection attempts': Infinity
    });
    
    socket.on('connect', function () {
        socket.emit('hello', {
            type: 'slave'
        });
    });
    
    setTimeout((function(){
        socket.emit('task-finished');
    }).bind(this), 1000);
})();