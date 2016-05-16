import os
from collections import namedtuple
from server.exceptions import InvalidPathException

class ScriptService(object):
    """docstring for ScriptService"""
    def __init__(self, root_folder):
        super(ScriptService, self).__init__()
        self._root_folder = root_folder if not root_folder[-1] == '\\' else root_folder[:-1]

    def get_scripts(self):
        return_type = namedtuple('ScriptLocator', ['name', 'type', 'id', 'children'])
        def construct_response(folder):
            retval = []
            for content in os.listdir(folder):
                full_path = os.path.join(folder, content)
                relpath = os.path.relpath(full_path, self._root_folder)
                if os.path.isdir(full_path):
                    children = construct_response(full_path)
                    retval.append(return_type(content, 'group', relpath, children))
                else:
                    retval.append(return_type(content, 'file', relpath, None))
            return retval

        children = construct_response(self._root_folder)
        folder_name = os.path.basename(self._root_folder)
        return [return_type(folder_name, 'group', '.', children)]

    def _get_rel_abs_path(self, id):
        abs_path = os.path.join(self._root_folder, id)
        relpath = os.path.relpath(os.path.normpath(abs_path), self._root_folder)
        return abs_path, relpath

    def get_script_content(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            with open(abs_path, 'r') as file:
                content = file.read()
            return content
        else:
            raise InvalidPathException()

    def get_script_location(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        return abs_path

    def update_script(self, id, content):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            with open(abs_path, 'w') as file:
                file.write(content)
        else:
            raise InvalidPathException()

    def delete_script(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            try:
                os.remove(abs_path)
            except WindowsError:
                pass
        else:
            raise InvalidPathException()

    def create_script(self, name, parent, content):
        id = os.path.normpath(os.path.join(self._root_folder, parent, name))
        id = os.path.relpath(id, self._root_folder)
        self.update_script(id, content)
        return id, os.path.basename(id), content
