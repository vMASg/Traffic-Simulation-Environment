from flask_restful import Resource, reqparse
from flask import request, send_file
from server.exceptions import InvalidPathException

class Script(Resource):
    """docstring for Script"""
    def __init__(self, script_locator, subscription_service):
        super(Script, self).__init__()
        self._script_locator = script_locator
        self._subscription_service = subscription_service

    def get(self, id):
        def get_data(data_type):
            if data_type == 'name':
                return self._script_locator.get_name(id)
            elif data_type == 'code':
                return self._script_locator.get_script_content(id)
            elif data_type == 'path':
                return self._script_locator.get_path(id)
            elif data_type == 'inout':
                return self._script_locator.get_input_output(id)
            else:
                return None

        parser = reqparse.RequestParser()
        parser.add_argument('name', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('code', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('path', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('inout', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('onlycode', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        args = parser.parse_args()
        if 'onlycode' in args or len(args) == 0:
            return send_file(self._script_locator.get_script_location(id))

        retval = {k: get_data(k) for k in args.keys()}
        retval['id'] = id
        return retval

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
