from server.resources.base_resource import BaseResource as Resource

class ModelCollection(Resource):
    """docstring for ModelCollection"""
    def __init__(self, model_locator, subscription_service):
        super(ModelCollection, self).__init__()
        self._model_locator = model_locator
        self._subscription_service = subscription_service

    def get(self):
        models = self._model_locator.get_models()
        return [
            {
                'id': model.id,
                'name': model.name,
                'type': 'model'
            }
            for model in models
        ]
