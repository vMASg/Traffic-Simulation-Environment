import json
from StringIO import StringIO
from flask import send_file
from flask_restful import reqparse, abort
from server.resources.base_resource import BaseResource as Resource
from server.exceptions import InvalidPathException

class Interface(Resource):
    """docstring for Interface"""
    def __init__(self, interface_locator, subscription_service):
        super(Interface, self).__init__()
        self._interface_locator = interface_locator
        self._subscription_service = subscription_service

    def get(self, id, hash=None):

        try:
            content = json.loads(self._interface_locator.get_interface_content(id, hash))
        except InvalidPathException:
            abort(404, message="Interface not found")

        def get_data(data_type):
            if data_type == 'hash':
                return self._interface_locator.get_revision_hashes(id)

        parser = reqparse.RequestParser()
        parser.add_argument('type', type=str, location='args', case_sensitive=False, store_missing=False)
        parser.add_argument('hash', type=lambda e: True, location='args', case_sensitive=False, store_missing=False)
        args = parser.parse_args()
        if 'type' in args and args['type'] in ['html', 'css', 'js']:
            content_to_send = content[args['type']]
            str_io = StringIO()
            str_io.write(content_to_send)
            str_io.seek(0)
            return send_file(str_io, as_attachment=False, mimetype="text/plain")
        elif len(args) > 0:
            retval = {k: get_data(k) for k in args.keys()}
            retval['id'] = id
            return retval

        return content


    def put(self, id):
        return self.put_resource(id, self._interface_locator.update_interface, self._changed_interface)

    def delete(self, id):
        return self.delete_resource(id, self._interface_locator.delete_interface, self._deleted_interface)

    def _deleted_interface(self, id):
        self._subscription_service.socketio.emit('deleted_interface', {'id': id}, namespace=self._subscription_service.namespace)

    def _changed_interface(self, id):
        self._subscription_service.socketio.emit('changed_interface', {'id': id}, namespace=self._subscription_service.namespace)
