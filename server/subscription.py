from flask_socketio import emit, join_room, leave_room

class SubscriptionChannel(object):
    """docstring for SubscriptionChannel"""
    def __init__(self, channel_name, socketio_obj):
        super(SubscriptionChannel, self).__init__()
        self.channel_name = channel_name
        self.previous_broadcasts = []
        self.socketio = socketio_obj

    def start(self):
        pass

    def broadcast(self, message):
        self.socketio.emit(self.channel_name + ':event', {'data': message}, room=self.channel_name)

    def end(self):
        self.socketio.emit(self.channel_name + ':EOT', {'data': ''}, room=self.channel_name)

    def catch_up(self):
        emit(self.channel_name + ':catchUp', self.previous_broadcasts)


class Subscription(object):
    """docstring for Subscription"""
    def __init__(self, socketio, namespace):
        super(Subscription, self).__init__()
        self.namespace = namespace
        self.socketio = socketio
        bind = lambda f, p1: lambda p2: f(p1, p2)
        self.connect = socketio.on('connect', namespace=namespace)(self.connect)
        self.disconnect = socketio.on('disconnect', namespace=namespace)(self.disconnect)
        self.subscribe = socketio.on('subscribe', namespace=self.namespace)(bind(self.subscribe, self))
        self.unsubscribe = socketio.on('unsubscribe', namespace=self.namespace)(bind(self.unsubscribe, self))
        self.channels = {}

    def create_channel(self, channel_name):
        sc = SubscriptionChannel(channel_name, self.socketio)
        self.channels[channel_name] = sc
        return sc

    def connect(self):
        emit('msg', 'connected')

    def disconnect(self):
        pass

    def subscribe(self, data):
        join_room(data['channel'])
        self.channels[data['channel']].catch_up()
        # TODO self.channels[data['channel']].announce_joined()

    def unsubscribe(self, data):
        leave_room(data['channel'])
