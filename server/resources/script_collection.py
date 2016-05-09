from flask.ext.restful import Resource
from flask_restful import reqparse
import os

class ScriptCollection(Resource):
    """docstring for ScriptCollection"""
    def __init__(self, script_locator):
        super(ScriptCollection, self).__init__()
        self._script_locator = script_locator

    def get(self):
        scripts = self._script_locator.get_scripts()
        def construct_response(scr):
            retval = []
            for script in scr:
                info = {'name': script.name}
                if script.type == 'group':
                    info['children'] = construct_response(script.children)
                    info['type'] = 'dir'
                else:
                    info['id'] = script.id
                    info['type'] = 'code'

                retval.append(info)
            return retval

        return construct_response(scripts)

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str)
        parser.add_argument('code', type=str)
        args = parser.parse_args()
        id, name, code = self._script_locator.create_script(args['name'], args['code'])
        return {'id': id, 'name': name, 'code': code}
