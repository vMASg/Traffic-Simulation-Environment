import json

class PipelineExecutor(object):
    """docstring for PipelineExecutor"""
    def __init__(self, aimsun_service, pipeline_service, script_service, model_service, subscription_service):
        super(PipelineExecutor, self).__init__()
        self.aimsun_service = aimsun_service
        self.pipeline_service = pipeline_service
        self.script_service = script_service
        self.model_service = model_service
        self.subscription_service = subscription_service
        self.pipeline_channel = subscription_service.create_channel('executions')
        self.pipeline_channel.start()

    def run_pipeline(self, id):
        pipeline_path = self.pipeline_service.get_path_for_execution(id)
        with open(pipeline_path, 'r') as f:
            pipeline = json.loads(f.read())

        # Change path for all scripts
        for script in pipeline:
            if script['type'] == 'code':
                script['path'] = self.script_service.get_path_for_execution(script['path'])
            elif script['type'] == 'model':
                script['path'] = self.model_service.get_path_for_execution(script['path'])

        with open(pipeline_path, 'w') as f:
            f.write(json.dumps(pipeline))

        # Create a new channel to send output to users
        sc = self.subscription_service.create_channel('pipeline-' + id)
        self.aimsun_service.run_pipeline(pipeline_path, sc)
        self.pipeline_channel.broadcast({'channel': sc.channel_name})
        return 'OK'
