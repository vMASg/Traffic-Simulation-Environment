import os
from collections import namedtuple

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
        folder_name = os.path.basename(self._root_folder if not self._root_folder[-1] == '\\' else self._root_folder[:-1])
        return [return_type(folder_name, 'group', None, children)]

    def get_script_content(self, id):
        with open(id, 'r') as file:
            content = file.read()
        return content

    def get_script_location(self, id):
        return id

    def update_script(self, id, content):
        with open(id, 'w') as file:
            file.write(content)

    def create_script(self, path, content):
        self.update_script(os.path.join(self._root_folder, path), content)
        return os.path.join(self._root_folder, path), os.path.basename(path), content
