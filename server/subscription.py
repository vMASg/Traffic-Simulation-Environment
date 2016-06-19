from flask_socketio import emit, join_room, leave_room

def connect():
    emit('msg', 'connected')

def disconnect():
    pass

class SubscriptionChannel(object):
    """docstring for SubscriptionChannel"""
    def __init__(self, channel_name):
        super(SubscriptionChannel, self).__init__()
        self.channel_name = channel_name


class Subscription(object):
    """docstring for Subscription"""
    def __init__(self, socketio, namespace):
        super(Subscription, self).__init__()
        self.namespace = namespace
        self.socketio = socketio
        self.connect = socketio.on('connect', namespace=namespace)(connect)
        self.disconnect = socketio.on('disconnect', namespace=namespace)(disconnect)

    def define_subscription(self, event, route, func):
        self.socketio.on(event, namespace=self.namespace + '/' + route)(func)
