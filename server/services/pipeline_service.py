import os
import shutil
from collections import namedtuple
from server.exceptions import InvalidPathException

class PipelineService(object):
    """docstring for PipelineService"""
    def __init__(self, root_folder):
        super(PipelineService, self).__init__()
        self._root_folder = root_folder if not root_folder[-1] == '\\' else root_folder[:-1]
        self._root_folder_content = os.path.join(self._root_folder, 'Pipelines')
        self._root_folder_tmp = os.path.join(self._root_folder, 'tmp')
        if not os.path.isdir(self._root_folder_content):
            os.mkdir(self._root_folder_content)
        if not os.path.isdir(self._root_folder_tmp):
            os.mkdir(self._root_folder_tmp)

    def get_pipelines(self):
        return_type = namedtuple('PipelineLocator', ['name', 'type', 'id', 'children'])
        def construct_response(folder):
            retval = []
            for content in os.listdir(folder):
                full_path = os.path.join(folder, content)
                relpath = os.path.relpath(full_path, self._root_folder_content)
                if os.path.isdir(full_path):
                    children = construct_response(full_path)
                    retval.append(return_type(content, 'group', relpath, children))
                else:
                    retval.append(return_type(content, 'file', relpath, None))
            return retval

        children = construct_response(self._root_folder_content)
        folder_name = os.path.basename(self._root_folder_content)
        return [return_type(folder_name, 'group', '.', children)]

    def _get_rel_abs_path(self, id):
        abs_path = os.path.join(self._root_folder_content, id)
        relpath = os.path.relpath(os.path.normpath(abs_path), self._root_folder_content)
        return abs_path, relpath

    def get_pipeline(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            with open(abs_path, 'r') as file:
                content = file.read()
            return id, os.path.basename(id), content
        else:
            raise InvalidPathException()

    def update_pipeline(self, id, content):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            with open(abs_path, 'w') as file:
                file.write(content)
        else:
            raise InvalidPathException()

    def delete_pipeline(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            try:
                os.remove(abs_path)
            except WindowsError:
                pass
        else:
            raise InvalidPathException()

    def create_pipeline(self, name, parent, content):
        id = os.path.normpath(os.path.join(self._root_folder_content, parent, name))
        id = os.path.relpath(id, self._root_folder_content)
        self.update_pipeline(id, content)
        return id, os.path.basename(id), content

    def get_path_for_execution(self, id):
        original_path = self._get_rel_abs_path(id)[0]
        basename = os.path.splitext(os.path.basename(original_path))
        ind = 0
        destination_path = os.path.join(self._root_folder_tmp, '{}_{}{}'.format(basename[0], ind, basename[1]))
        # destination_path = os.path.join(self._root_folder_tmp, '{}{}'.format(basename[0], basename[1]))
        while os.path.isfile(destination_path):
            ind += 1
            destination_path = os.path.join(self._root_folder_tmp, '{}_{}{}'.format(basename[0], ind, basename[1]))
        shutil.copy2(original_path, destination_path)
        # shutil.copy2(original_path, destination_path)
        return destination_path
