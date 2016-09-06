from flask_socketio import emit, join_room, leave_room, disconnect
from flask_login import current_user
from functools import wraps
from collections import OrderedDict
from time import time
import json

def authenticated_only(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            disconnect()
        else:
            return f(*args, **kwargs)
    return wrapped

class Channel(object):
    """docstring for Channel"""
    def __init__(self):
        super(Channel, self).__init__()
        self._users = []

    def catch_up(self):
        pass

    def user_in(self, username):
        self._users.append(username)

    def user_out(self, username):
        if username in self._users:
            self._users.remove(username)

    def is_dead(self):
        return len(self._users) == 0

class SubscriptionChannel(Channel):
    """docstring for SubscriptionChannel"""
    def __init__(self, channel_name, socketio_obj, namespace, alive='always', persist=False):
        super(SubscriptionChannel, self).__init__()
        self.channel_name = channel_name
        self.previous_broadcasts = []
        self.socketio = socketio_obj
        self.namespace = namespace
        self.alive = alive
        self.persist = persist
        self.has_started, self.has_ended = False, False

    def start(self):
        self.has_started = True

    def broadcast(self, message):
        self.previous_broadcasts.append(message)
        self.socketio.emit(self.channel_name + ':event', {'data': message}, room=self.channel_name, namespace=self.namespace)

    def end(self, retval=None):
        self.has_ended = True
        self.socketio.emit(self.channel_name + ':EOT', {'data': retval or ''}, room=self.channel_name, namespace=self.namespace)
        # TODO delete from Subscription.channels, save transmissions in file (?)

    def catch_up(self):
        emit(self.channel_name + ':catchUp', {'transmission': self.previous_broadcasts})

    def is_dead(self):
        if self.alive == 'always':
            return False
        else:
            return self.has_ended and super(SubscriptionChannel, self).is_dead()


class CodeChannel(Channel):
    """docstring for CodeChannel"""

    class RecursiveDict(OrderedDict):
        """Implementation of perl's autovivification feature."""
        def __missing__(self, key):
            value = self[key] = type(self)()
            return value

        def __str__(self):
            return '{{{}}}'.format(','.join('{}:{}'.format(k, v) for k, v in self.iteritems()))

    def __init__(self, script_id, socketio_obj, namespace):
        super(CodeChannel, self).__init__()
        self.script_id = script_id
        self.socketio = socketio_obj
        self.namespace = namespace
        self._receive_set = socketio_obj.on('{}:set'.format(self.script_id), namespace=namespace)(self.filter(self.receive_set))
        self._receive_remove = socketio_obj.on('{}:remove'.format(self.script_id), namespace=namespace)(self.filter(self.receive_remove))
        self._receive_initial = socketio_obj.on('{}:initial'.format(self.script_id), namespace=namespace)(self.filter(self.receive_initial))
        self._receive_on_disconnect = socketio_obj.on('{}:ondisconnect'.format(self.script_id), namespace=namespace)(self.filter(self.receive_on_disconnect))


        self.internal_state = self.RecursiveDict()
        # self.internal_state[''] = self.RecursiveDict()
        self.internal_state['checkpoint'] = self.RecursiveDict()
        self.internal_state['history'] = self.RecursiveDict()
        self.internal_state['users'] = self.RecursiveDict()

        self.on_disconnect_operations = {}

    def filter(self, func):
        def decorator(data):
            if data['room'] == self.script_id:
                func(data['msg'])
                # with open('C:\\Users\\Victor\\Downloads\\internal_state.json', 'w') as f:
                #     f.write(json.dumps(self.internal_state, indent=4))
        return decorator

    def navigate(self, paths):
        retval = self.internal_state
        for path in paths:
            retval = retval[path]
        return retval

    def replace_special(self, data):
        if isinstance(data, dict):
            if '.sv' in data and data['.sv'] == 'timestamp':
                data = int(time())
            else:
                for k, v in data.iteritems():
                    data[k] = self.replace_special(v)
        elif isinstance(data, list):
            for ind, elem in enumerate(data):
                data[ind] = self.replace_special(elem)
        return data

    def propagate_changes(self, paths, key):
        target = self.internal_state
        accum_path = ''
        for path, subpath in zip(paths, paths[1:] + [key]):
            target = target[path]
            accum_path = '{}/{}'.format(accum_path, path) if accum_path != '' else path
            self.socketio.emit(
                '{}#{}:{}'.format(self.script_id, accum_path, 'child_changed'),
                {'key': subpath, 'value': target[subpath]},
                room=self.script_id,
                namespace=self.namespace
            )

    def user_out(self, username):
        super(CodeChannel, self).user_out(username)
        if username in self.on_disconnect_operations:
            operations = self.on_disconnect_operations[username]
            for operation in operations:
                if operation['operation'] == 'remove':
                    self.receive_remove(operation)

    def receive_set(self, data):
        data['data'] = self.replace_special(data['data'])
        path = data['path'].split('/')
        parent = self.navigate(path[:-1])
        new_child = path[-1] not in parent
        parent[path[-1]] = data['data']
        self.socketio.emit(
            '{}#{}:{}'.format(self.script_id, '/'.join(path[:-1]), 'child_added' if new_child else 'child_changed'),
            {'key': path[-1], 'value':parent[path[-1]]},
            room=self.script_id,
            namespace=self.namespace
        )
        if len(path) > 1:
            self.propagate_changes(path[:-2], path[-2])

    def receive_remove(self, data):
        path = data['path'].split('/')
        parent = self.navigate(path[:-1])
        self.socketio.emit(
            '{}#{}:{}'.format(self.script_id, '/'.join(path[:-1]), 'child_removed'),
            {'key': path[-1], 'value':parent[path[-1]]},
            room=self.script_id,
            namespace=self.namespace
        )
        del parent[path[-1]]
        if len(path) > 1:
            self.propagate_changes(path[:-2], path[-2])

    def receive_initial(self, data):
        path = data['path'].split('/')
        event_type = data['type']
        initial_data = self.navigate(path)
        if event_type == 'value':
            emit('{}#{}:{}'.format(self.script_id, data['path'], event_type), {'key': path[-1], 'value': initial_data})
        elif event_type == 'child_added':
            for k, v in initial_data.iteritems():
                emit('{}#{}:{}'.format(self.script_id, data['path'], event_type), {'key': k, 'value': v})

    def receive_on_disconnect(self, data):
        if current_user.username not in self.on_disconnect_operations:
            self.on_disconnect_operations[current_user.username] = []

        if data['operation'] == 'cancel':
            self.on_disconnect_operations[current_user.username] = []
        else:
            self.on_disconnect_operations[current_user.username].append(data)


    # def catch_up(self):
    #     self.send_child(self.internal_state['checkpoint'], 'checkpoint')
    #     self.send_child(self.internal_state['history'], 'history')
    #     self.send_child(self.internal_state['users'], 'users')

    # def send_child(self, state, path):
    #     for key, child in state.iteritems():
    #         joined_path = '{}/{}'.format(path, key)
    #         emit('{}:child_added'.format(joined_path), child)
    #         if isinstance(child, self.RecursiveDict):
    #             self.send_child(child, joined_path)
    #         emit('{}:value'.format(joined_path), child)


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

    def create_subscription_channel(self, channel_name, alive="always", persist=False):
        sc = SubscriptionChannel(channel_name, self.socketio, self.namespace, alive, persist)
        self.channels[channel_name] = sc
        return sc

    def remove_user_from_channel(self, username, channel_name, channel):
        channel.user_out(username)
        if channel.is_dead():
            del self.channels[channel_name]

    @authenticated_only
    def connect(self):
        emit('connect', 'connected')

    def disconnect(self):
        print u'disconnected {}'.format(current_user.username)
        dead_channels = []
        for channel_name, channel in self.channels.iteritems():
            leave_room(channel_name)
            channel.user_out(current_user.username)
            if channel.is_dead():
                dead_channels.append(channel_name)
            # self.remove_user_from_channel(current_user.username, channel_name, channel)

        for channel_name in dead_channels:
            del self.channels[channel_name]

    @authenticated_only
    def subscribe(self, data):
        join_room(data['channel'])
        channel = self.channels[data['channel']]
        channel.user_in(current_user.username)
        channel.catch_up()
        print 'subscribed to {}'.format(data['channel'])
        # TODO self.channels[data['channel']].announce_joined()

    @authenticated_only
    def unsubscribe(self, data):
        channel_name, channel = data['channel'], self.channels[data['channel']]
        leave_room(channel_name)
        self.remove_user_from_channel(current_user.username, channel_name, channel)
        print 'unsubscribed from {}'.format(channel_name)

    @authenticated_only
    def join_code_channel(self, data):
        if data['channel'] not in self.channels:
            cc = CodeChannel(data['channel'], self.socketio, self.namespace)
            self.channels[data['channel']] = cc
        join_room(data['channel'])
        channel = self.channels[data['channel']]
        channel.user_in(current_user.username)
        channel.catch_up()
        print 'subscribed to {}'.format(data['channel'])
        # TODO self.channels[data['channel']].announce_joined()
