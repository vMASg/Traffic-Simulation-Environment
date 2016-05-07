from flask.ext.restful import Resource
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
