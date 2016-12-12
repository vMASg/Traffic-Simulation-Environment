import os
import re
from flask_login import current_user
from collections import namedtuple
from server.exceptions import InvalidPathException
from server.utils.script_info import ScriptInfo
from server.exceptions import LockException
from server.services.base_service import BaseService

class ScriptService(BaseService):
    """docstring for ScriptService"""
    def __init__(self, root_folder, git_service):
        super(ScriptService, self).__init__(root_folder, git_service=git_service, gitignore_file='*.pyc\n', rtype="script")

    def get_scripts(self):
        return_type = namedtuple('ScriptLocator', ['name', 'type', 'id', 'path', 'children'])
        exceptions = [r'\.\w+', r'.*\.pyc']
        def construct_response(folder):
            retval = []
            for content in os.listdir(folder):
                if not any(re.match(pattern, content) is not None for pattern in exceptions):
                    full_path = os.path.join(folder, content)
                    relpath = os.path.relpath(full_path, self._root_folder_content)
                    if os.path.isdir(full_path):
                        children = construct_response(full_path)
                        retval.append(return_type(content, 'group', self.get_id_from_path(relpath), relpath, children))
                    else:
                        retval.append(return_type(content, 'file', self.get_id_from_path(relpath), relpath, None))
            return retval

        children = construct_response(self._root_folder_content)
        folder_name = 'Scripts'
        return [return_type(folder_name, 'group', self.get_id_from_path('.'), '.', children)]

    def get_script_content(self, id, hash=None):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            if hash is not None:
                abs_path = self.get_path_for_execution(id, hash)

            with open(abs_path, 'r') as file:
                content = file.read()

            if hash is not None:
                os.remove(abs_path)

            return content
        else:
            raise InvalidPathException()

    def get_script_location(self, id):
        return self._get_rel_abs_path(id)[0]

    def update_script(self, id, content):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            with open(abs_path, 'w') as file:
                file.write(content)
            author = '{} <{}>'.format(current_user.username, current_user.email)
            message = 'Committing {}'.format(relpath)
            self.git_service.commit_file(abs_path, self._root_folder_content, author, message=message)
        else:
            raise InvalidPathException()

    def delete_script(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            try:
                os.remove(abs_path)
                if os.path.isfile(abs_path + 'c'):
                    os.remove(abs_path + 'c')
                os.removedirs(os.path.split(abs_path)[0])
                self._delete_resource(id)
            except WindowsError:
                pass
            except OSError:
                pass
        else:
            raise InvalidPathException()

    def create_script(self, name, parent, content):
        path = os.path.normpath(os.path.join(self._root_folder_content, parent, name))
        rel_path = os.path.relpath(path, self._root_folder_content)
        id = self._new_resource(rel_path)
        parent_folder = os.path.split(path)[0]
        if not os.path.isdir(parent_folder):
            os.makedirs(parent_folder)
        self.update_script(id, content)
        return id, os.path.basename(rel_path), content

    # FIELDS QUERY
    def get_name(self, id):
        return os.path.basename(self._get_rel_abs_path(id)[0])

    def get_path(self, id):
        return self._get_rel_abs_path(id)[1]

    def get_revision_hashes(self, id):
        return self.git_service.get_revision_hashes(self._get_rel_abs_path(id)[0], self._root_folder_content)

    def get_path_for_execution(self, id, hash=None):
        path = self._get_rel_abs_path(id)[0]
        if hash is not None:
            content = self.git_service.get_content(path, self._root_folder_content, hash)
        else:
            with open(path, 'r') as f:
                content = f.read()
        path = os.path.join(self._root_folder_tmp, '{}_{}'.format(hash or '', os.path.basename(path)))
        with open(path, 'w') as p:
            p.write(content)

        return path

    def get_clean_up_function(self, copy_path):
        def clean_up_func(**kwargs):
            os.remove(copy_path)
            if os.path.isfile(copy_path + 'c'):
                os.remove(copy_path + 'c')

        return clean_up_func

    # def get_input_output(self, id):
    #     si = ScriptInfo(self._get_rel_abs_path(id)[0])
    #     return si.get_inputs_outputs()

    # def get_script_type(self, id):
    #     si = ScriptInfo(self._get_rel_abs_path(id)[0])
    #     return si.get_script_type(), si.requires_model()

    def get_script_info(self, id, hash=None):
        path = self._get_rel_abs_path(id)[0]
        if hash is not None:
            path = self.get_path_for_execution(id, hash)

        if not os.path.isfile(path):
            return None

        info = ScriptInfo(path)

        if hash is not None:
            os.remove(path)

        return info
