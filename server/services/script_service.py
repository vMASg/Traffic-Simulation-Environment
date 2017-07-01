import os
from server.exceptions import InvalidPathException
from server.utils.script_info import ScriptInfo
from server.services.base_service import BaseService

class ScriptService(BaseService):
    """docstring for ScriptService"""
    def __init__(self, root_folder, git_service):
        super(ScriptService, self).__init__(root_folder, git_service=git_service, gitignore_file='*.pyc\n', rtype="script")

    def get_scripts(self):
        return self.get_resources('Scripts')

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
        return self.update_resource(id, content)

    def delete_script(self, id):
        return self.delete_resource(id)

    def create_script(self, name, parent, content):
        return self.create_resource(name, parent, content)

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
        path = self.get_path_for_execution(id, hash)

        if not os.path.isfile(path):
            return None

        info = ScriptInfo(path)

        os.remove(path)
        if os.path.exists(path + 'c'):
            os.remove(path + 'c')

        return info
