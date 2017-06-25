from server.resources.base_resource import BaseResource as Resource

class PipelineCollection(Resource):
    """docstring for PipelineCollection"""
    def __init__(self, pipeline_locator, subscription_service):
        super(PipelineCollection, self).__init__()
        self._pipeline_locator = pipeline_locator
        self._subscription_service = subscription_service

    def get(self):
        return self.get_resource_collection(self._pipeline_locator.get_pipelines, 'pipeline')

    def post(self):
        return self.post_resource_collection(
            self._pipeline_locator.create_pipeline,
            self._new_pipeline,
            data_arg_name='data',
            res_type='pipeline'
        )

    def _new_pipeline(self, data):
        self._subscription_service.socketio.emit('new_pipeline', data, namespace=self._subscription_service.namespace)
