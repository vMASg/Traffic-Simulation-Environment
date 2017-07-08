from server.services.base_service import BaseService
from server.exceptions import InvalidPathException

class InterfaceService(BaseService):
    """docstring for InterfaceService"""

    def __init__(self, root_folder, git_service):
        super(InterfaceService, self).__init__(root_folder, git_service=git_service)

    def get_interfaces(self):
        return self.get_resources('Interfaces')

    def get_interface_location(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        return abs_path

    def get_interface_content(self, id, hash=None):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            if hash is not None:
                content = self.git_service.get_content(abs_path, self._root_folder_content, hash)
            else:
                with open(abs_path, 'r') as file:
                    content = file.read()

            return content
        else:
            raise InvalidPathException()

    def update_interface(self, id, content):
        return self.update_resource(id, content)

    def delete_interface(self, id):
        return self.delete_resource(id)

    def create_interface(self, name, parent, content):
        return self.create_resource(name, parent, content)
