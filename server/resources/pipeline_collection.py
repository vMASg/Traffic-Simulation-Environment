from flask_restful import reqparse
from server.resources.base_resource import BaseResource as Resource
from server.exceptions import InvalidPathException
import os

class PipelineCollection(Resource):
    """docstring for PipelineCollection"""
    def __init__(self, pipeline_locator, subscription_service):
        super(PipelineCollection, self).__init__()
        self._pipeline_locator = pipeline_locator
        self._subscription_service = subscription_service

    def get(self):
        pipelines = self._pipeline_locator.get_pipelines()
        def construct_response(pip):
            retval = []
            for pipeline in pip:
                info = {
                    'id': pipeline.id,
                    'name': pipeline.name,
                    'path': pipeline.path
                }
                if pipeline.type == 'group':
                    info['type'] = 'dir'
                    info['children'] = construct_response(pipeline.children)
                else:
                    info['type'] = 'pipeline'

                retval.append(info)
            return retval

        return construct_response(pipelines)

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str)
        parser.add_argument('parent', type=str)
        parser.add_argument('data', type=str)
        args = parser.parse_args()
        args['parent'] = os.path.join(*args['parent'].split('/'))
        try:
            id, name, graph = self._pipeline_locator.create_pipeline(args['name'], args['parent'], args['data'])
        except InvalidPathException as e:
            return e.msg, 403

        data = {'id': id, 'name': name, 'type': 'pipeline', 'data': graph}
        self._new_pipeline(data)
        return data

    def _new_pipeline(self, data):
        self._subscription_service.socketio.emit('new_pipeline', data, namespace=self._subscription_service.namespace)
