import os
from flask_restful import reqparse, abort
from flask import request, send_file
from server.resources.base_resource import BaseResource as Resource
from server.exceptions import InvalidPathException

class Execution(Resource):
    """docstring for Execution"""
    def __init__(self, root_folder, subscription_service):
        super(Execution, self).__init__()
        self._root_folder = root_folder
        self._subscription_service = subscription_service

    def get(self, id):
        abs, rel = self._get_rel_abs_path(id)
        if rel.startswith('..'):
            return '', 403
        return send_file(abs)

    def _get_rel_abs_path(self, id):
        abs_path = os.path.join(self._root_folder, id)
        relpath = os.path.relpath(os.path.normpath(abs_path), self._root_folder)
        return abs_path, relpath

    def delete(self, id):
        abs, rel = self._get_rel_abs_path(id)
        if rel.startswith('..'):
            return '', 403
        if os.path.exists(abs):
            os.remove(abs)
        self._deleted_execution(id)

    def _deleted_execution(self, id):
        self._subscription_service.socketio.emit('deleted_finished_task', {'id': id}, namespace=self._subscription_service.namespace)
