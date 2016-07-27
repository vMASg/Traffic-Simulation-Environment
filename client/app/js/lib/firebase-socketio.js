function SocketIOFirebase(socket, path) {
    this.socket = socket;
    this.path = path || '';
}

SocketIOFirebase.prototype.root = function () {
    return new SocketIOFirebase(this.socket, '');
};

SocketIOFirebase.prototype.child = function (childname) {
    return new SocketIOFirebase(this.socket, this.path + '/' + childname);
};

SocketIOFirebase.prototype.push = function () {
    // TODO implement -- can be ignored for this proj
    // Could be named get name
    // var 
    // this.socket.emit('push', {path: this.path}, function (json) {
    //     // body...
    // });
    console.error("Oups");
    debugger;
};

SocketIOFirebase.prototype.set = function (data) {
    this.socket.emit('set', JSON.stringify(data));
};

SocketIOFirebase.prototype.once = function (eventType, successCallback) {
    var self = this;
    var callback = function (snapshot) {
        self.off(eventType, callback);
        successCallback(snapshot);
    };
    this.on(eventType, callback);
};

SocketIOFirebase.prototype.startAt = function (argument) {
    // TODO implement
};

SocketIOFirebase.prototype.on = function (eventType, callback, context) {
    // TODO implement
};

SocketIOFirebase.prototype.off = function (eventType, callback, context) {
    // TODO implement
};

SocketIOFirebase.prototype.key = function () {
    return this.path.indexOf('/') >= 0?this.path.split('/').pop():null;
};

SocketIOFirebase.prototype.remove = function () {
    // TODO implement
};

SocketIOFirebase.prototype.onDisconnect = function () {
    return new SocketIOFirebaseOnDisconnect(this);
};

SocketIOFirebase.prototype.transaction = function (func, onComplete, applyLocaly) {
    // TODO implement
};

SocketIOFirebase.prototype.toString = function () {
    // TODO implement
};

function SocketIOFirebaseOnDisconnect(context) {
    this.path = context.path;
    this.eventsQueue = [];
}

SocketIOFirebaseOnDisconnect.prototype.cancel = function () {
    this.eventsQueue = [];
};

SocketIOFirebaseOnDisconnect.prototype.remove = function () {
    // body...
};