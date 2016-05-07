from flask.ext.restful import Resource
from flask import request

class Script(Resource):
    """docstring for Script"""
    def __init__(self, script_locator):
        super(Script, self).__init__()
        self._script_locator = script_locator

    def get(self, id):
        return self._script_locator.get_script(id)

    def put(self, id):
        self._script_locator.update_script(id, request.get_data())
