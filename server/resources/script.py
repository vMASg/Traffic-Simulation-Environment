from flask.ext.restful import Resource
from flask import request, send_file
from server.exceptions import InvalidPathException

class Script(Resource):
    """docstring for Script"""
    def __init__(self, script_locator, subscription_service):
        super(Script, self).__init__()
        self._script_locator = script_locator
        self._subscription_service = subscription_service

    def get(self, id):
        return send_file(self._script_locator.get_script_location(id))

    def put(self, id):
        try:
            self._script_locator.update_script(id, request.get_data())
        except InvalidPathException as e:
            return e.msg, 403

    def delete(self, id):
        try:
            self._script_locator.delete_script(id)
        except InvalidPathException as e:
            return e.msg, 403
        else:
            self._deleted_script(id)

    def _deleted_script(self, id):
        self._subscription_service.socketio.emit('deleted_script', {'id': id}, namespace=self._subscription_service.namespace)
