import os
import json
from time import time
from flask import request, abort
from flask_login import current_user
from server.exceptions import RecursivePipelineCall

class PipelineExecutor(object):
    """docstring for PipelineExecutor"""

    _RUN_SCRIPT_PIPELINE_PATH = os.path.join('server', 'external', 'run_script.pipeline')

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

    def _prepare_pipeline(self, id, loaded_pipelines=None, clean_up=None):
        loaded_pipelines = loaded_pipelines if loaded_pipelines is not None else {}
        clean_up = clean_up if clean_up is not None else []
        if id in loaded_pipelines:
            # TODO remove the exception when conditional nodes are included
            # raise RecursivePipelineCall()
            return loaded_pipelines[id]

        pipeline_path = self.pipeline_service.get_path_for_execution(id)
        clean_up.append(self.pipeline_service.get_clean_up_function(pipeline_path))
        with open(pipeline_path, 'r') as f:
            pipeline = json.loads(f.read())

        # Change path for all scripts
        pipeline_nodes = pipeline['nodes']
        for node in pipeline_nodes:
            if node['type'] == 'code':
                node['path'] = self.script_service.get_path_for_execution(node['oid'], hash=node['hash'])
                clean_up.append(self.script_service.get_clean_up_function(node['path']))
            elif node['type'] == 'model':
                node['originalModelPath'] = self.model_service.get_path(node['oid'])
                node['path'] = self.model_service.get_path_for_execution(node['oid'])
                clean_up.append(self.model_service.get_clean_up_function(node['path']))
            elif node['type'] == 'pipeline':
                node['path'] = self._prepare_pipeline(node['oid'], loaded_pipelines, clean_up)

        with open(pipeline_path, 'w') as f:
            f.write(json.dumps(pipeline))

        loaded_pipelines[id] = pipeline_path
        return pipeline_path

    def run_pipeline(self, id):
        clean_up_functions = []
        try:
            pipeline_path = self._prepare_pipeline(id, clean_up=clean_up_functions)
        except RecursivePipelineCall:
            abort(400)

        input_path, output_path = None, pipeline_path + '.output'

        def delete_input_output(**kwargs):
            if input_path is not None and os.path.isfile(input_path):
                os.remove(input_path)
            if output_path is not None and os.path.isfile(output_path):
                os.remove(output_path)

        clean_up_functions.append(delete_input_output)

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
                'task': id,
                'hash': self.pipeline_service.get_pipeline(id)[4][0]
            }

        # Create a new channel to send output to users
        sc = self.subscription_service.create_subscription_channel('pipeline={}={}'.format(id, meta['requestTime']), alive='while_active', persist=True, persist_type='unique')
        sc.meta = meta

        current_user_info = {'username': current_user.username, 'email': current_user.email}

        def clean_up():
            for func in clean_up_functions:
                func(pipeline_path=pipeline_path, execution_name=sc.persist_file_id(), current_user_info=current_user_info)

        is_executor, only_python = self._is_executor_only_python(pipeline_path)
        self.aimsun_service.run_pipeline((pipeline_path, input_path, output_path, clean_up), sc, is_executor=is_executor, only_python=only_python)
        # self.pipeline_channel.broadcast({'channel': sc.channel_name})
        return 'OK'

    def run_script(self, script_content, model_id):
        # return self._aimsun_proc1.run_script(script_content, model_id)
        # raise DeprecationWarning()
        model_path = self.model_service.get_path_for_execution(model_id)
        clean_up_func = self.model_service.get_clean_up_function(model_path)
        original_model = self.model_service.get_path(model_id)
        input_path = model_path + '.input'

        content = {'model_id': (model_path, original_model), 'script_content': script_content}
        with open(input_path, 'w') as f:
            f.write(json.dumps(content))

        def delete_input(**kwargs):
            if input_path is not None and os.path.isfile(input_path):
                os.remove(input_path)

        meta = {
            'user': current_user.username,
            'requestTime': time(),
            'type': 'immediate script',
            'comment': '',
            'task': model_id,
            'hash': None
        }

        channel_name = '{}=script={}={}'.format(current_user.username, model_id, meta['requestTime'])
        subs_chan = self.subscription_service.create_subscription_channel(channel_name, alive="while_active", persist=False)
        subs_chan.meta = meta

        def clean_up():
            clean_up_func(pipeline_path='', execution_name='', current_user_info={})
            delete_input()

        self.aimsun_service.run_pipeline((self._RUN_SCRIPT_PIPELINE_PATH, input_path, None, clean_up), subs_chan)
        return channel_name

    def model_run_script(self, id, script_id):
        script = ""
        if script_id is None:
            script = request.get_data()
        else:
            script = self.script_service.get_script_content(script_id)
        return json.dumps({'channel_name': self.run_script(script, id)})
