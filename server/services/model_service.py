import os
from collections import namedtuple

class ModelService(object):
    """docstring for ModelService"""
    def __init__(self, root_folder):
        super(ModelService, self).__init__()
        self._root_folder = root_folder

    def get_models(self):
        return_type = namedtuple('ModelLocator', ['id', 'name'])
        retval = []
        for element in os.listdir(self._root_folder):
            full_path = os.path.join(self._root_folder, element)
            if os.path.isfile(full_path) and element[-4:] == '.ang':
                retval.append(return_type(full_path, element))
        return retval
