import os
import re
import shutil
# from flask_login import current_user
from collections import namedtuple
from server.exceptions import InvalidPathException
# from server.utils.script_info import ScriptInfo
# from server.exceptions import LockException

class InterfaceService(object):
    """docstring for InterfaceService"""

    JS_DEFAULT_CONTENT = """angular.module('trafficEnv')
.controller('MyCtrl', function($scope){
    // TODO
});
"""

    def __init__(self, root_folder, git_service):
        super(InterfaceService, self).__init__()
        self._root_folder = root_folder if root_folder[-1] != '\\' else root_folder[:-1]
        self._root_folder_content = os.path.join(self._root_folder, 'content')
        # self._root_folder_tmp = os.path.join(self._root_folder, 'tmp')
        if not os.path.isdir(self._root_folder_content):
            os.mkdir(self._root_folder_content)
        # if not os.path.isdir(self._root_folder_tmp):
        #     os.mkdir(self._root_folder_tmp)

        # self.git_service = git_service
        # if not os.path.isdir(os.path.join(self._root_folder_content, '.git')):
        #     git_service.init_repo(self._root_folder_content)
        #     with open(os.path.join(self._root_folder_content, '.gitignore'), 'w') as git_ignore:
        #         git_ignore.write('*.pyc\n')
        #     git_service.commit_file('.', self._root_folder_content, 'auto.environ <environ@foo.com>', message='Initial commit')

    def get_interfaces(self):
        return_type = namedtuple('InterfaceLocator', ['name', 'type', 'id', 'children'])
        exceptions = [r'\.\w+']
        def construct_response(folder):
            retval = []
            for content in os.listdir(folder):
                if not any(re.match(pattern, content) is not None for pattern in exceptions):
                    full_path = os.path.join(folder, content)
                    relpath = os.path.relpath(full_path, self._root_folder_content)
                    if os.path.isdir(full_path):
                        children = construct_response(full_path)
                        retval.append(return_type(content, 'group', relpath, children))
                    else:
                        retval.append(return_type(content, 'file', relpath, None))
            return retval

        children = construct_response(self._root_folder_content)
        folder_name = 'Interfaces'
        return [return_type(folder_name, 'group', '.', children)]

    def _get_rel_abs_path(self, id):
        abs_path = os.path.join(self._root_folder_content, id)
        relpath = os.path.relpath(os.path.normpath(abs_path), self._root_folder_content)
        return abs_path, relpath

    def get_interface_location(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        return abs_path

    def update_interface(self, id, content):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            with open(abs_path, 'w') as file:
                file.write(content)
            # author = '{} <{}>'.format(current_user.username, current_user.email)
            # message = 'Committing {}'.format(relpath)
            # self.git_service.commit_file(abs_path, self._root_folder_content, author, message=message)
        else:
            raise InvalidPathException()

    def delete_interface(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            try:
                abs_path = os.path.split(abs_path)[0]
                shutil.rmtree(abs_path)
                # os.removedirs(os.path.split(abs_path)[0])
            except WindowsError:
                pass
        else:
            raise InvalidPathException()

    def create_interface(self, name, parent, content):
        path = os.path.normpath(os.path.join(self._root_folder_content, parent, name))
        id = os.path.relpath(path, self._root_folder_content)
        basename = os.path.basename(id)
        basepath = os.path.join(id, basename)
        # parent_folder = os.path.split(path)[0]
        parent_folder = path
        if not os.path.isdir(parent_folder):
            os.makedirs(parent_folder)
        self.update_interface(basepath + '.html', content)
        self.update_interface(basepath + '.js', self.JS_DEFAULT_CONTENT)
        self.update_interface(basepath + '.css', '')
        self.update_interface(basepath + '.intf', '')
        return basepath + '.html', basename + '.html', content

    # # FIELDS QUERY
    # def get_name(self, id):
    #     return os.path.basename(id)

    # def get_path(self, id):
    #     return id

    # def get_revision_hashes(self, id):
    #     return self.git_service.get_revision_hashes(self._get_rel_abs_path(id)[0], self._root_folder_content)

    # def get_path_for_execution(self, id, hash=None):
    #     path = self._get_rel_abs_path(id)[0]
    #     if hash is not None:
    #         content = self.git_service.get_content(path, self._root_folder_content, hash)
    #         path = os.path.join(self._root_folder_tmp, '{}_{}'.format(hash, os.path.basename(id)))
    #         with open(path, 'w') as p:
    #             p.write(content)

    #     return path

    # def get_input_output(self, id):
    #     si = ScriptInfo(self._get_rel_abs_path(id)[0])
    #     return si.get_inputs_outputs()

    # def get_script_type(self, id):
    #     si = ScriptInfo(self._get_rel_abs_path(id)[0])
    #     return si.get_script_type(), si.requires_model()

    # def get_script_info(self, id):
    #     path = self._get_rel_abs_path(id)[0]
    #     return ScriptInfo(path) if os.path.isfile(path) else None
