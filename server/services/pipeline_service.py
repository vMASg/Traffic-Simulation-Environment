import os
import shutil
from server.exceptions import InvalidPathException
from server.services.base_service import BaseService

class PipelineService(BaseService):
    """docstring for PipelineService"""
    def __init__(self, root_folder, git_service):
        super(PipelineService, self).__init__(root_folder, git_service=git_service, rtype="pipeline")

    def get_pipelines(self):
        return self.get_resources('Pipelines')

    def get_pipeline(self, id, hash=None):
        abs_path, relpath = self._get_rel_abs_path(id)
        abs_path_hash = None
        if not relpath.startswith('..'):
            if hash is not None:
                abs_path_hash = self.get_path_for_execution(id, hash)

            with open(abs_path_hash or abs_path, 'r') as file:
                content = file.read()

            if hash is not None:
                os.remove(abs_path_hash)

            hashes = self.git_service.get_revision_hashes(abs_path, self._root_folder_content)
            return id, os.path.basename(abs_path), relpath, content, hashes
        else:
            raise InvalidPathException()

    def update_pipeline(self, id, content):
        return self.update_resource(id, content)

    def delete_pipeline(self, id):
        return self.delete_resource(id)

    def create_pipeline(self, name, parent, content):
        return self.create_resource(name, parent, content)

    def get_revision_hashes(self, id):
        return self.git_service.get_revision_hashes(self._get_rel_abs_path(id)[0], self._root_folder_content)

    def get_path_for_execution(self, id, hash=None):
        original_path = self._get_rel_abs_path(id)[0]
        basename = os.path.splitext(os.path.basename(original_path))
        if hash is not None:
            content = self.git_service.get_content(original_path, self._root_folder_content, hash)
            basename = ('{}_{}'.format(hash, basename), basename[1])
        ind = 0
        destination_path = os.path.join(self._root_folder_tmp, '{}_{}{}'.format(basename[0], ind, basename[1]))
        # destination_path = os.path.join(self._root_folder_tmp, '{}{}'.format(basename[0], basename[1]))
        while os.path.isfile(destination_path):
            ind += 1
            destination_path = os.path.join(self._root_folder_tmp, '{}_{}{}'.format(basename[0], ind, basename[1]))

        if hash is not None:
            with open(destination_path, 'w') as p:
                p.write(content)
        else:
            shutil.copy2(original_path, destination_path)
        # shutil.copy2(original_path, destination_path)
        return destination_path

    def get_clean_up_function(self, copy_path):
        def clean_up_func(**kwargs):
            os.remove(copy_path)

        return clean_up_func
