from flask_socketio import emit, join_room, leave_room

class Channel(object):
    """docstring for Channel"""
    def __init__(self):
        super(Channel, self).__init__()

    def catch_up(self):
        pass

class SubscriptionChannel(Channel):
    """docstring for SubscriptionChannel"""
    def __init__(self, channel_name, socketio_obj, namespace):
        super(SubscriptionChannel, self).__init__()
        self.channel_name = channel_name
        self.previous_broadcasts = []
        self.socketio = socketio_obj
        self.namespace = namespace

    def start(self):
        pass

    def broadcast(self, message):
        self.previous_broadcasts.append(message)
        self.socketio.emit(self.channel_name + ':event', {'data': message}, room=self.channel_name, namespace=self.namespace)

    def end(self):
        self.socketio.emit(self.channel_name + ':EOT', {'data': ''}, room=self.channel_name, namespace=self.namespace)
        # TODO delete from Subscription.channels, save transmissions in file (?)

    def catch_up(self):
        emit(self.channel_name + ':catchUp', {'transmission': self.previous_broadcasts})


class CodeChannel(Channel):
    """docstring for CodeChannel"""

    class RecursiveDict(dict):
        """Implementation of perl's autovivification feature."""
        def __missing__(self, key):
            value = self[key] = type(self)()
            return value

    def __init__(self, script_id, socketio_obj, namespace):
        super(CodeChannel, self).__init__()
        self.script_id = script_id
        self.socketio = socketio_obj
        self.namespace = namespace
        self.receive_set = socketio_obj.on('set', namespace=namespace)(self.filter(self.receive_set))
        self.receive_remove = socketio_obj.on('remove', namespace=namespace)(self.filter(self.receive_remove))


        self.internal_state = self.RecursiveDict()

    def filter(self, func):
        def decorator(data):
            if data['room'] == self.script_id:
                func(data['msg'])
        return decorator

    def navigate(self, paths):
        retval = self.internal_state
        for path in paths:
            retval = retval[path]
        return retval

    def propagate_changes(self, paths):
        target = self.internal_state
        accum_path = ''
        for path in paths:
            target = target[path]
            accum_path = '{}/{}'.format(accum_path, path)
            self.socketio.emit(
                '{}:{}'.format(accum_path, 'child_changed'),
                target,
                room=self.script_id,
                namespace=self.namespace
            )

    def receive_set(self, data):
        path = data['path'].split('/')
        parent = self.navigate(path[:-1])
        new_child = path[-1] not in parent
        parent[path[-1]] = data['data']
        self.socketio.emit(
            '{}:{}'.format(data['path'], 'child_added' if new_child else 'child_changed'),
            parent[path[-1]],
            room=self.script_id,
            namespace=self.namespace
        )
        self.propagate_changes(path[:-1])

    def receive_remove(self, data):
        path = data['path'].split('/')
        parent = self.navigate(path[:-1])
        self.socketio.emit(
            '{}:{}'.format(data['path'], 'child_removed'),
            parent[path[-1]],
            room=self.script_id,
            namespace=self.namespace
        )
        del parent[path[-1]]
        self.propagate_changes(path[:-1])

    def catch_up(self):
        self.send_child(self.internal_state, '')

    def send_child(self, state, path):
        for key, child in state.iteritems():
            joined_path = '{}/{}'.format(path, key)
            emit('{}:child_added'.format(joined_path), child)
            if isinstance(child, self.RecursiveDict):
                self.send_child(child, joined_path)


class Subscription(object):
    """docstring for Subscription"""
    def __init__(self, socketio, namespace):
        super(Subscription, self).__init__()
        self.namespace = namespace
        self.socketio = socketio
        # bind = lambda f, p1: lambda p2: f(p1, p2)
        self.connect = socketio.on('connect', namespace=namespace)(self.connect)
        self.disconnect = socketio.on('disconnect', namespace=namespace)(self.disconnect)
        self.subscribe = socketio.on('subscribe', namespace=self.namespace)(self.subscribe)
        self.unsubscribe = socketio.on('unsubscribe', namespace=self.namespace)(self.unsubscribe)
        self.join_code_channel = socketio.on('join_code_channel', namespace=self.namespace)(self.join_code_channel)
        self.channels = {}

    def create_subscription_channel(self, channel_name):
        sc = SubscriptionChannel(channel_name, self.socketio, self.namespace)
        self.channels[channel_name] = sc
        return sc

    def connect(self):
        emit('connect', 'connected')

    def disconnect(self):
        emit('disconnect', 'disconnected')

    def subscribe(self, data):
        join_room(data['channel'])
        self.channels[data['channel']].catch_up()
        print 'subscribed to {}'.format(data['channel'])
        # TODO self.channels[data['channel']].announce_joined()

    def unsubscribe(self, data):
        leave_room(data['channel'])

    def join_code_channel(self, data):
        if data['channel'] not in self.channels:
            cc = CodeChannel(data['channel'], self.socketio, self.namespace)
            self.channels[data['channel']] = cc
        join_room(data['channel'])
        self.channels[data['channel']].catch_up()
        print 'subscribed to {}'.format(data['channel'])
        # TODO self.channels[data['channel']].announce_joined()
