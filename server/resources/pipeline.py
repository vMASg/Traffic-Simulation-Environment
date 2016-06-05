from flask_restful import Resource, reqparse
from flask import request, send_file
from server.exceptions import InvalidPathException

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

    # def delete(self, id):
    #     try:
    #         self._pipeline_locator.delete_script(id)
    #     except InvalidPathException as e:
    #         return e.msg, 403
    #     else:
    #         self._deleted_script(id)

    # def _deleted_script(self, id):
    #     self._subscription_service.socketio.emit('deleted_script', {'id': id}, namespace=self._subscription_service.namespace)
