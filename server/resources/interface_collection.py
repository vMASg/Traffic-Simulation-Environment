from server.resources.base_resource import BaseResource as Resource

class InterfaceCollection(Resource):
    """docstring for InterfaceCollection"""
    def __init__(self, interface_locator, subscription_service):
        super(InterfaceCollection, self).__init__()
        self._interface_locator = interface_locator
        self._subscription_service = subscription_service

    def get(self):
        return self.get_resource_collection(self._interface_locator.get_interfaces, 'interface')

    def post(self):
        return self.post_resource_collection(
            self._interface_locator.create_interface,
            self._new_interface,
            data_arg_name='code',
            res_type='interface'
        )

    def _new_interface(self, data):
        self._subscription_service.socketio.emit('new_interface', data, namespace=self._subscription_service.namespace)
