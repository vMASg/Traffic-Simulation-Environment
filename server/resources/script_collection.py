from server.resources.base_resource import BaseResource as Resource

class ScriptCollection(Resource):
    """docstring for ScriptCollection"""
    def __init__(self, script_locator, subscription_service):
        super(ScriptCollection, self).__init__()
        self._script_locator = script_locator
        self._subscription_service = subscription_service

    def get(self):
        return self.get_resource_collection(self._script_locator.get_scripts, 'code')

    def post(self):
        return self.post_resource_collection(
            self._script_locator.create_script,
            self._new_script,
            data_arg_name='code',
            res_type='code'
        )

    def _new_script(self, data):
        self._subscription_service.socketio.emit('new_script', data, namespace=self._subscription_service.namespace)
