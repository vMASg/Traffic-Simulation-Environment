import os
import shutil
# from flask_login import current_user
from server.exceptions import InvalidPathException
# from server.utils.script_info import ScriptInfo
# from server.exceptions import LockException
from server.services.base_service import BaseService

class InterfaceService(BaseService):
    """docstring for InterfaceService"""

    JS_DEFAULT_CONTENT = """angular.module('trafficEnv')
.controller('MyCtrl', function($scope){
    // TODO
});
"""

    def __init__(self, root_folder, git_service):
        super(InterfaceService, self).__init__(root_folder, git_service=git_service)

    def get_interfaces(self):
        return self.get_resources('Interfaces')

    def get_interface_location(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        return abs_path

    def update_interface(self, id, content):
        return self.update_resource(id, content)

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
