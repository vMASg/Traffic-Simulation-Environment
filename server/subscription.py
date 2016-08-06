from flask_socketio import emit, join_room, leave_room
from collections import OrderedDict
from time import time
import json

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
        self.receive_set = socketio_obj.on('set', namespace=namespace)(self.filter(self.receive_set))
        self.receive_remove = socketio_obj.on('remove', namespace=namespace)(self.filter(self.receive_remove))
        self.receive_initial = socketio_obj.on('initial', namespace=namespace)(self.filter(self.receive_initial))


        self.internal_state = self.RecursiveDict()
        # self.internal_state[''] = self.RecursiveDict()
        self.internal_state['checkpoint'] = self.RecursiveDict()
        self.internal_state['history'] = self.RecursiveDict()
        self.internal_state['users'] = self.RecursiveDict()

    def filter(self, func):
        def decorator(data):
            if data['room'] == self.script_id:
                func(data['msg'])
                with open('C:\\Users\\Victor\\Downloads\\internal_state.json', 'w') as f:
                    f.write(json.dumps(self.internal_state, indent=4))
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
                '{}:{}'.format(accum_path, 'child_changed'),
                {'key': path, 'value': target[subpath]},
                room=self.script_id,
                namespace=self.namespace
            )

    def receive_set(self, data):
        data['data'] = self.replace_special(data['data'])
        path = data['path'].split('/')
        parent = self.navigate(path[:-1])
        new_child = path[-1] not in parent
        parent[path[-1]] = data['data']
        self.socketio.emit(
            '{}:{}'.format('/'.join(path[:-1]), 'child_added' if new_child else 'child_changed'),
            {'key': path[-1], 'value':parent[path[-1]]},
            room=self.script_id,
            namespace=self.namespace
        )
        self.propagate_changes(path[:-2], path[-2])

    def receive_remove(self, data):
        path = data['path'].split('/')
        parent = self.navigate(path[:-1])
        self.socketio.emit(
            '{}:{}'.format('/'.join(path[:-1]), 'child_removed'),
            {'key': path[-1], 'value':parent[path[-1]]},
            room=self.script_id,
            namespace=self.namespace
        )
        del parent[path[-1]]
        self.propagate_changes(path[:-2], path[-2])

    def receive_initial(self, data):
        path = data['path'].split('/')
        event_type = data['type']
        initial_data = self.navigate(path)
        if event_type == 'value':
            emit('{}:{}'.format(data['path'], event_type), {'key': path[-1], 'value': initial_data})
        elif event_type == 'child_added':
            for k, v in initial_data.iteritems():
                emit('{}:{}'.format(data['path'], event_type), {'key': k, 'value': v})


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
