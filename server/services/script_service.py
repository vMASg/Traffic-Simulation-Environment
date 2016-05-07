import os
from collections import namedtuple
from flask import send_file

class ScriptService(object):
    """docstring for ScriptService"""
    def __init__(self, root_folder):
        super(ScriptService, self).__init__()
        self._root_folder = root_folder

    def get_scripts(self):
        return_type = namedtuple('ScriptLocator', ['name', 'type', 'id', 'children'])
        def construct_response(folder):
            retval = []
            for content in os.listdir(folder):
                full_path = os.path.join(folder, content)
                if os.path.isdir(full_path):
                    children = construct_response(full_path)
                    retval.append(return_type(content, 'group', None, children))
                else:
                    retval.append(return_type(content, 'file', full_path, None))
            return retval

        children = construct_response(self._root_folder)
        return [return_type(self._root_folder, 'group', None, children)]

    def get_script(self, id):
        return send_file(id)

    def update_script(self, id, content):
        with open(id, 'w') as file:
            file.write(content)
