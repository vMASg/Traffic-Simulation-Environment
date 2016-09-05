from flask_restful import reqparse
from flask import request, send_file
from server.exceptions import InvalidPathException
from server.resources.base_resource import BaseResource as Resource

class Pipeline(Resource):
    """docstring for Pipeline"""
    def __init__(self, pipeline_locator, subscription_service):
        super(Pipeline, self).__init__()
        self._pipeline_locator = pipeline_locator
        self._subscription_service = subscription_service

    def get(self, id):
        id, name, content = self._pipeline_locator.get_pipeline(id)
        return {'id': id, 'name': name, 'graph': content}

    def put(self, id):
        try:
            self._pipeline_locator.update_pipeline(id, request.get_data())
        except InvalidPathException as e:
            return e.msg, 403
        else:
            self._changed_pipeline(id)

    def delete(self, id):
        try:
            self._pipeline_locator.delete_pipeline(id)
        except InvalidPathException as e:
            return e.msg, 403
        else:
            self._deleted_pipeline(id)

    def _deleted_pipeline(self, id):
        self._subscription_service.socketio.emit('deleted_pipeline', {'id': id}, namespace=self._subscription_service.namespace)

    def _changed_pipeline(self, id):
        self._subscription_service.socketio.emit('changed_pipeline', {'id': id}, namespace=self._subscription_service.namespace)
