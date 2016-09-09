from flask_restful import reqparse, abort
from flask import request, send_file
from server.resources.base_resource import BaseResource as Resource
from server.exceptions import InvalidPathException

class Interface(Resource):
    """docstring for Interface"""
    def __init__(self, interface_locator, subscription_service):
        super(Interface, self).__init__()
        self._interface_locator = interface_locator
        self._subscription_service = subscription_service

    def get(self, id):
        return send_file(self._interface_locator.get_interface_location(id))


    def put(self, id):
        try:
            self._interface_locator.update_interface(id, request.get_data())
        except InvalidPathException as e:
            return e.msg, 403

    def delete(self, id):
        try:
            self._interface_locator.delete_interface(id)
        except InvalidPathException as e:
            return e.msg, 403
        else:
            self._deleted_interface(id)

    def _deleted_interface(self, id):
        self._subscription_service.socketio.emit('deleted_interface', {'id': id}, namespace=self._subscription_service.namespace)
