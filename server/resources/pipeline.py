from server.resources.base_resource import BaseResource as Resource

class Pipeline(Resource):
    """docstring for Pipeline"""
    def __init__(self, pipeline_locator, subscription_service):
        super(Pipeline, self).__init__()
        self._pipeline_locator = pipeline_locator
        self._subscription_service = subscription_service

    def get(self, id, hash=None):
        id, name, path, content, hashes = self._pipeline_locator.get_pipeline(id, hash)
        hashesinfo = [{'id': hid, 'author': author, 'timestamp': time} for hid, author, time in hashes]
        return {'id': id, 'name': name, 'path': path, 'graph': content, 'hash': hashesinfo}

    def put(self, id):
        return self.put_resource(id, self._pipeline_locator.update_pipeline, self._changed_pipeline)

    def delete(self, id):
        return self.delete_resource(id, self._pipeline_locator.delete_pipeline, self._deleted_pipeline)

    def _deleted_pipeline(self, id):
        self._subscription_service.socketio.emit('deleted_pipeline', {'id': id}, namespace=self._subscription_service.namespace)

    def _changed_pipeline(self, id):
        self._subscription_service.socketio.emit('changed_pipeline', {'id': id}, namespace=self._subscription_service.namespace)
