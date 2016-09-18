import json
from flask import request, abort
from server.resources.base_resource import BaseResource as Resource

class Model(Resource):
    """docstring for Model"""
    def __init__(self, model_locator, subscription_service):
        super(Model, self).__init__()
        self._model_locator = model_locator
        self._subscription_service = subscription_service

    def get(self, id):
        model = self._model_locator.get_model(id)
        if model is None:
            abort(404)
        return model
