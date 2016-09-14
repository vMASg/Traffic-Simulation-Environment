import os
from flask_restful import reqparse, abort
from flask import request, send_file
from server.resources.base_resource import BaseResource as Resource
from server.exceptions import InvalidPathException

class Script(Resource):
    """docstring for Script"""
    def __init__(self, script_locator, subscription_service):
        super(Script, self).__init__()
        self._script_locator = script_locator
        self._subscription_service = subscription_service

    def get(self, id, hash=None):

        script_content_info = self._script_locator.get_script_info(id, hash)
        if script_content_info is None:
            abort(404, message="Script not found")

        def get_data(data_type):
            if data_type == 'name':
                return self._script_locator.get_name(id)
            elif data_type == 'code':
                return self._script_locator.get_script_content(id, hash)
            elif data_type == 'path':
                return self._script_locator.get_path(id)
            elif data_type == 'hash':
                return self._script_locator.get_revision_hashes(id)
            elif data_type == 'inout':
                return script_content_info.get_inputs_outputs()
            elif data_type == 'stype':
                return script_content_info.get_script_type()
            elif data_type == 'reqmodel':
                return script_content_info.requires_model()
            else:
                return None

        parser = reqparse.RequestParser()
        parser.add_argument('name', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('code', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('path', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('hash', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('inout', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('stype', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('reqmodel', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('onlycode', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        args = parser.parse_args()
        if 'onlycode' in args or len(args) == 0:
            if hash is None:
                return send_file(self._script_locator.get_script_location(id))
            else:
                path = self._script_locator.get_path_for_execution(id, hash)
                retval = send_file(path)
                # os.remove(path)
                return retval

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
