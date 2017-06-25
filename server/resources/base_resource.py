import os
from functools import wraps
from flask_restful import Resource, abort
from flask_restful import reqparse
from flask_login import current_user
from server.exceptions import InvalidPathException

def authenticated_only(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_active:
            abort(401)
        else:
            return f(*args, **kwargs)
    return wrapped

class BaseResource(Resource):
    """docstring for BaseResource"""
    method_decorators = [authenticated_only]

    @staticmethod
    def get_resource_collection(locator, type_name):
        resources = locator()
        def construct_response(res):
            retval = []
            for resource in res:
                info = {
                    'id': resource.id,
                    'name': resource.name,
                    'path': resource.path
                }
                if resource.type == 'group':
                    info['type'] = 'dir'
                    info['children'] = construct_response(resource.children)
                else:
                    info['type'] = type_name

                retval.append(info)
            return retval

        return construct_response(resources)

    @staticmethod
    def post_resource_collection(create_resource_fn, announce_creation_fn, data_arg_name, res_type):
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str)
        parser.add_argument('parent', type=str)
        parser.add_argument(data_arg_name, type=str)
        args = parser.parse_args()
        args['parent'] = os.path.join(*args['parent'].split('/'))
        try:
            id, name, data = create_resource_fn(args['name'], args['parent'], args[data_arg_name])
        except InvalidPathException as e:
            return e.msg, 403

        data = {'id': id, 'name': name, 'type': res_type, data_arg_name: data}
        announce_creation_fn(data)
        return data
