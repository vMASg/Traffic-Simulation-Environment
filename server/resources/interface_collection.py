from server.resources.base_resource import BaseResource as Resource
from flask_restful import reqparse
from server.exceptions import InvalidPathException
import os

class InterfaceCollection(Resource):
    """docstring for InterfaceCollection"""
    def __init__(self, interface_locator, subscription_service):
        super(InterfaceCollection, self).__init__()
        self._interface_locator = interface_locator
        self._subscription_service = subscription_service

    def get(self):
        interfaces = self._interface_locator.get_interfaces()
        def construct_response(scr):
            retval = []
            for script in scr:
                info = {'name': script.name}
                if script.type == 'group':
                    info['id'] = script.id
                    info['type'] = 'dir'
                    info['children'] = construct_response(script.children)
                else:
                    info['id'] = script.id
                    info['type'] = 'interface' if script.name.endswith('.intf') else 'intcode'

                retval.append(info)
            return retval

        return construct_response(interfaces)

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str)
        parser.add_argument('parent', type=str)
        parser.add_argument('code', type=str)
        args = parser.parse_args()
        args['parent'] = os.path.join(*args['parent'].split('/'))
        try:
            id, name, code = self._interface_locator.create_interface(args['name'], args['parent'], args['code'])
        except InvalidPathException as e:
            return e.msg, 403

        data = {'id': id, 'name': name, 'type': 'interface' if name.endswith('.intf') else 'intcode', 'code': code}
        self._new_interface(data)
        return data

    def _new_interface(self, data):
        self._subscription_service.socketio.emit('new_interface', data, namespace=self._subscription_service.namespace)
