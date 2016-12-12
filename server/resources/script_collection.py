from server.resources.base_resource import BaseResource as Resource
from flask_restful import reqparse
from server.exceptions import InvalidPathException
import os

class ScriptCollection(Resource):
    """docstring for ScriptCollection"""
    def __init__(self, script_locator, subscription_service):
        super(ScriptCollection, self).__init__()
        self._script_locator = script_locator
        self._subscription_service = subscription_service

    def get(self):
        scripts = self._script_locator.get_scripts()
        def construct_response(scr):
            retval = []
            for script in scr:
                info = {
                    'id': script.id,
                    'name': script.name,
                    'path': script.path
                }
                if script.type == 'group':
                    info['type'] = 'dir'
                    info['children'] = construct_response(script.children)
                else:
                    info['type'] = 'code'

                retval.append(info)
            return retval

        return construct_response(scripts)

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str)
        parser.add_argument('parent', type=str)
        parser.add_argument('code', type=str)
        args = parser.parse_args()
        try:
            id, name, code = self._script_locator.create_script(args['name'], args['parent'], args['code'])
        except InvalidPathException as e:
            return e.msg, 403

        data = {'id': id, 'name': name, 'type': 'code', 'code': code}
        self._new_script(data)
        return data

    def _new_script(self, data):
        self._subscription_service.socketio.emit('new_script', data, namespace=self._subscription_service.namespace)
