import os
import json
from server.resources.base_resource import BaseResource as Resource
from flask_restful import reqparse
from server.exceptions import InvalidPathException

class ExecutionCollection(Resource):
    """docstring for ExecutionCollection"""
    def __init__(self, root_folder, subscription_service):
        super(ExecutionCollection, self).__init__()
        self._root_folder = root_folder
        self._subscription_service = subscription_service

    def get(self):
        retval = []
        for content in os.listdir(self._root_folder):
            name = content[:content.rfind('-', 0, content.rfind('#'))]
            path = os.path.join(self._root_folder, content)
            with open(path, 'r') as f:
                data = json.loads(f.read())
            retval.append({'id': content, 'name': name, 'data': data})
        return retval

    # def _new_interface(self, data):
    #     self._subscription_service.socketio.emit('new_interface', data, namespace=self._subscription_service.namespace)
