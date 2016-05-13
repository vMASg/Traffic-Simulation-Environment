from flask import request

class Model(object):
    """docstring for Model"""
    def __init__(self, aimsun_service, model_service, script_service):
        super(Model, self).__init__()
        self.aimsun_service = aimsun_service
        self.model_service = model_service
        self.script_service = script_service

    def run_script(self, id, script_id):
        script = ""
        if script_id is None:
            script = request.get_data()
        else:
            script = self.script_service.get_script_content(script_id)
        return self.aimsun_service.run_script(script, id)
