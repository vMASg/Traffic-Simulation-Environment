from flask_socketio import emit

def connect():
    emit('msg', 'connected')

class Subscription(object):
    """docstring for Subscription"""
    def __init__(self, socketio, namespace):
        super(Subscription, self).__init__()
        self.connect = socketio.on('connect', namespace=namespace)(connect)
