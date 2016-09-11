import os
import shutil
import re
from flask_login import current_user
from collections import namedtuple
from server.exceptions import InvalidPathException

class PipelineService(object):
    """docstring for PipelineService"""
    def __init__(self, root_folder, git_service):
        super(PipelineService, self).__init__()
        self._root_folder = root_folder if not root_folder[-1] == '\\' else root_folder[:-1]
        self._root_folder_content = os.path.join(self._root_folder, 'content')
        self._root_folder_tmp = os.path.join(self._root_folder, 'tmp')
        if not os.path.isdir(self._root_folder_content):
            os.mkdir(self._root_folder_content)
        if not os.path.isdir(self._root_folder_tmp):
            os.mkdir(self._root_folder_tmp)

        self.git_service = git_service
        if not os.path.isdir(os.path.join(self._root_folder_content, '.git')):
            git_service.init_repo(self._root_folder_content)
            git_service.commit_file('.', self._root_folder_content, 'auto.environ <environ@foo.com>', message='Initial commit')

    def get_pipelines(self):
        return_type = namedtuple('PipelineLocator', ['name', 'type', 'id', 'children'])
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
        folder_name = 'Pipelines'
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
            hash = self.git_service.get_revision_hash(abs_path, self._root_folder_content)
            return id, os.path.basename(id), content, hash
        else:
            raise InvalidPathException()

    def update_pipeline(self, id, content):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            with open(abs_path, 'w') as file:
                file.write(content)
            author = '{} <{}>'.format(current_user.username, current_user.email)
            message = 'Committing {}'.format(relpath)
            self.git_service.commit_file(abs_path, self._root_folder_content, author, message=message)
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

    def get_revision_hash(self, id):
        return self.git_service.get_revision_hash(self._get_rel_abs_path(id)[0], self._root_folder_content)

    def get_path_for_execution(self, id, hash=None):
        original_path = self._get_rel_abs_path(id)[0]
        basename = os.path.splitext(os.path.basename(original_path))
        if hash is not None:
            content = self.git_service.get_content(original_path, self._root_folder_content, hash)
            basename[0] = '{}_{}'.format(hash, basename)
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
