from flask import request, abort
from werkzeug.utils import secure_filename
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

    def post(self):
        if 'model' not in request.files:
            abort(400, message='model not found')

        file = request.files['model']
        if file.filename == '':
            abort(400, message='model not found')

        if file and file.filename.endswith('.ang'):
            filename = secure_filename(file.filename)
            id, name = self._model_locator.create_model(file, filename)
            data = {'id': id, 'name': name, 'type': 'model'}
            self._new_model(data)
            return data

    def _new_model(self, data):
        self._subscription_service.socketio.emit('new_model', data, namespace=self._subscription_service.namespace)
