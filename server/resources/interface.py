from flask import send_file
from server.resources.base_resource import BaseResource as Resource

class Interface(Resource):
    """docstring for Interface"""
    def __init__(self, interface_locator, subscription_service):
        super(Interface, self).__init__()
        self._interface_locator = interface_locator
        self._subscription_service = subscription_service

    def get(self, id):
        return send_file(self._interface_locator.get_interface_location(id))


    def put(self, id):
        return self.put_resource(id, self._interface_locator.update_interface, self._changed_interface)

    def delete(self, id):
        return self.delete_resource(id, self._interface_locator.delete_interface, self._deleted_interface)

    def _deleted_interface(self, id):
        self._subscription_service.socketio.emit('deleted_interface', {'id': id}, namespace=self._subscription_service.namespace)

    def _changed_interface(self, id):
        self._subscription_service.socketio.emit('changed_interface', {'id': id}, namespace=self._subscription_service.namespace)
