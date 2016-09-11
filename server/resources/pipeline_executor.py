import json
from time import time
from flask import request, abort
from flask_login import current_user
from server.exceptions import RecursivePipelineCall

class PipelineExecutor(object):
    """docstring for PipelineExecutor"""

    _RUN_SCRIPT_PIPELINE_PATH = 'server\\external\\run_script.pipeline'

    def __init__(self, aimsun_service, pipeline_service, script_service, model_service, subscription_service):
        super(PipelineExecutor, self).__init__()
        self.aimsun_service = aimsun_service
        self.pipeline_service = pipeline_service
        self.script_service = script_service
        self.model_service = model_service
        self.subscription_service = subscription_service
        # self.pipeline_channel = subscription_service.create_subscription_channel('executions')
        # self.pipeline_channel.start()

    def _is_executor_only_python(self, pipeline_path):
        with open(pipeline_path, 'r') as f:
            pipeline = json.loads(f.read())
        return pipeline['isExecutor'], not pipeline['aimsun']

    def _prepare_pipeline(self, id, loaded_pipelines=None):
        loaded_pipelines = loaded_pipelines or {}
        if id in loaded_pipelines:
            # TODO remove the exception when conditional nodes are included
            raise RecursivePipelineCall()
            return loaded_pipelines[id]

        pipeline_path = self.pipeline_service.get_path_for_execution(id)
        with open(pipeline_path, 'r') as f:
            pipeline = json.loads(f.read())

        # Change path for all scripts
        pipeline_nodes = pipeline['nodes']
        for node in pipeline_nodes:
            if node['type'] == 'code':
                node['path'] = self.script_service.get_path_for_execution(node['path'], hash=node['hash'])
            elif node['type'] == 'model':
                node['path'] = self.model_service.get_path_for_execution(node['path'])
            elif node['type'] == 'pipeline':
                node['path'] = self._prepare_pipeline(node['path'], loaded_pipelines)

        with open(pipeline_path, 'w') as f:
            f.write(json.dumps(pipeline))

        loaded_pipelines[id] = pipeline_path
        return pipeline_path

    def run_pipeline(self, id):
        try:
            pipeline_path = self._prepare_pipeline(id)
        except RecursivePipelineCall:
            abort(400)

        input_path, output_path = None, pipeline_path + '.output'

        if request.method == 'POST':
            data = json.loads(request.get_data())
            comment = data['comment']
            del data['comment']
            input_path = pipeline_path + '.input'
            with open(input_path, 'w') as inp:
                inp.write(json.dumps(data))

            meta = {
                'user': current_user.username,
                'requestTime': time(),
                'type': 'pipeline',
                'comment': comment,
                'task': id
            }

        # Create a new channel to send output to users
        sc = self.subscription_service.create_subscription_channel('pipeline-{}-{}'.format(id, meta['requestTime']), alive='while_active', persist=True, persist_type='unique')
        sc.meta = meta
        is_executor, only_python = self._is_executor_only_python(pipeline_path)
        self.aimsun_service.run_pipeline((pipeline_path, input_path, output_path), sc, is_executor=is_executor, only_python=only_python)
        # self.pipeline_channel.broadcast({'channel': sc.channel_name})
        return 'OK'

    def run_script(self, script_content, model_id):
        # return self._aimsun_proc1.run_script(script_content, model_id)
        # raise DeprecationWarning()
        model_path = self.model_service.get_path_for_execution(model_id)
        input_path = model_path + '.input'

        content = {'model_id': model_path, 'script_content': script_content}
        with open(input_path, 'w') as f:
            f.write(json.dumps(content))

        meta = {
            'user': current_user.username,
            'requestTime': time(),
            'type': 'immediate script',
            'comment': '',
            'task': model_id
        }

        channel_name = '{}-script-{}-{}'.format(current_user.username, model_id, meta['requestTime'])
        subs_chan = self.subscription_service.create_subscription_channel(channel_name, alive="while_active", persist=False)
        subs_chan.meta = meta
        self.aimsun_service.run_pipeline((self._RUN_SCRIPT_PIPELINE_PATH, input_path, None), subs_chan)
        return channel_name
