function SocketIOFirebase(socket, room, callbackFunctions, path, key_min) {
    this.socket = socket;
    this.room = room;
    this.path = path || '';
    this.key_min = key_min || '';
    this.callbackFunctions = callbackFunctions || {};
}

SocketIOFirebase.prototype.initRoom = function () {
    this.socket.emit('join_code_channel', {channel: this.room});
};

SocketIOFirebase.prototype.wrap = function (msg) {
    return {room: this.room, msg: msg};
};

SocketIOFirebase.prototype.root = function () {
    return new SocketIOFirebase(this.socket, this.room, this.callbackFunctions, '');
};

SocketIOFirebase.prototype.child = function (childname) {
    return new SocketIOFirebase(this.socket, this.room, this.callbackFunctions, this.path===''?childname:this.path + '/' + childname);
};

SocketIOFirebase.prototype.push = function () {
    // TODO implement -- can be ignored for this proj
    // Could be named get name
    // var 
    // this.socket.emit('push', {path: this.path}, function (json) {
    //     // body...
    // });
    // console.error("Oups");
    // debugger;

    // var userName = prompt("Enter user name");
    // return {
    //     key: function () { return userName; }
    // };
    return '{{ current_user.username }}';
};

SocketIOFirebase.prototype.set = function (data) {
    this.socket.emit(this.room + ':set', this.wrap({path: this.path, data: data}));
};

SocketIOFirebase.prototype.transaction = function (func, onComplete, applyLocaly) {
    // TODO implement -- Assumes it never fails
    this.socket.emit(this.room + ':set', this.wrap({path: this.path, data: func(null)}), function () {
        onComplete(null, true);
    });
};

SocketIOFirebase.prototype.remove = function () {
    this.socket.emit(this.room + ':remove', this.wrap({path: this.path}));
};

SocketIOFirebase.prototype.once = function (eventType, successCallback) {
    var self = this;
    var callback = function (snapshot) {
        self.off(eventType, callback);
        successCallback(snapshot);
    };
    this.on(eventType, callback);
};

SocketIOFirebase.prototype.startAt = function (value, key) {
    // simplified implementation given usage
    return new SocketIOFirebase(this.socket, this.room, this.callbackFunctions, this.path, key);
};

SocketIOFirebase.prototype.on = function (eventType, callback, context) {
    // child_added, child_changed, child_removed
    var self = this;
    var event = this.room + '#' + this.path + ':' + eventType;
    var registeredCallback = function (data) {
        // var json = JSON.parse(data);
        var snapshot = new Snapshot(data);
        if (!self.key_min || self.key_min <= snapshot.key()) {
            callback.call(context, snapshot);
        }
    };
    if (!this.callbackFunctions[event]) {
        this.callbackFunctions[event] = [];
    }
    this.callbackFunctions[event].push([callback, registeredCallback]);
    this.socket.on(event, registeredCallback);
    // Sending initial request if eventType is value or child_added
    if (eventType == 'value' || eventType == 'child_added') {
        this.socket.emit(this.room + ':initial', this.wrap({ path: this.path, type:eventType }));
    }
};

SocketIOFirebase.prototype.off = function (eventType, callback, context) {
    var event = this.room + '#' + this.path + ':' + eventType;
    var registeredCallback = this.callbackFunctions[event].find(function (cb) {
        return cb[0] === callback;
    })[1];
    this.socket.removeListener(event, registeredCallback);
};

SocketIOFirebase.prototype.key = function () {
    return this.path.indexOf('/') >= 0?this.path.split('/').pop():null;
};

SocketIOFirebase.prototype.onDisconnect = function () {
    return new SocketIOFirebaseOnDisconnect(this);
};

SocketIOFirebase.prototype.toString = function () {
    return this.room + '#' + this.path;
};

function SocketIOFirebaseOnDisconnect(context) {
    // TODO should be implemented in the server
    this.socket = context.socket;
    this.room = context.room;
    this.path = context.path;
    this.eventsQueue = [];

    this.socket.on('disconnect', (function () {
        for (var i = 0; i < this.eventsQueue.length; ++i) {
            this.eventsQueue[i]();
        }
    }).bind(this));
}

SocketIOFirebaseOnDisconnect.prototype.wrap = function (msg) {
    return {room: this.room, msg: msg};
};

SocketIOFirebaseOnDisconnect.prototype.cancel = function () {
    this.eventsQueue = [];
};

SocketIOFirebaseOnDisconnect.prototype.remove = function () {
    var self = this;
    this.eventsQueue.push(function () {
        self.socket.emit(self.room + ':remove', self.wrap({path: self.path}));
    });
};

function Snapshot(data) {
    this.data = data;
}

Snapshot.prototype.key = function () {
    return this.data.key?this.data.key:null;
};

Snapshot.prototype.val = function () {
    return this.data.value?this.data.value:null;
};

Snapshot.prototype.child = function (name) {
    return new Snapshot(this.data.value[name]?{key: name, value:this.data.value[name]}:{});
};