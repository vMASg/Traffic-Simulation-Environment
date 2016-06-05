class PipelineExecutor(object):
    """docstring for PipelineExecutor"""
    def __init__(self, aimsun_service, pipeline_service):
        super(PipelineExecutor, self).__init__()
        self.aimsun_service = aimsun_service
        self.pipeline_service = pipeline_service

    def run_pipeline(self, id):
        pass
