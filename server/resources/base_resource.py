from flask_restful import Resource, abort
from flask_login import current_user
from functools import wraps

def authenticated_only(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            abort(401)
        else:
            return f(*args, **kwargs)
    return wrapped

class BaseResource(Resource):
	"""docstring for BaseResource"""
	method_decorators = [authenticated_only]
