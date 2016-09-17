import os
import shutil
from collections import namedtuple

class ModelService(object):
    """docstring for ModelService"""
    def __init__(self, root_folder, git_service):
        super(ModelService, self).__init__()
        self.git_service = git_service
        self._root_folder = root_folder if not root_folder[-1] == '\\' else root_folder[:-1]
        self._root_folder_content = os.path.join(self._root_folder, 'content')
        self._root_folder_tmp = os.path.join(self._root_folder, 'tmp')
        if not os.path.isdir(self._root_folder_content):
            os.mkdir(self._root_folder_content)
        if not os.path.isdir(self._root_folder_tmp):
            os.mkdir(self._root_folder_tmp)

    def get_models(self):
        return_type = namedtuple('ModelLocator', ['id', 'name'])
        retval = []
        for element in os.listdir(self._root_folder_content):
            full_path = os.path.join(self._root_folder_content, element)
            if os.path.isfile(full_path) and element[-4:] == '.ang':
                retval.append(return_type(element, element))
        return retval

    def _get_rel_abs_path(self, id):
        abs_path = os.path.join(self._root_folder_content, id)
        relpath = os.path.relpath(os.path.normpath(abs_path), self._root_folder_content)
        return abs_path, relpath

    def get_path_for_execution(self, id):
        original_path = self._get_rel_abs_path(id)[0]
        basename = os.path.splitext(os.path.basename(original_path))
        ind = 0
        destination_path = os.path.join(self._root_folder_tmp, '{}_{}'.format(basename[0], ind))
        # destination_path = os.path.join(self._root_folder_tmp, '{}{}'.format(basename[0], basename[1]))
        while os.path.exists(destination_path):
            ind += 1
            destination_path = os.path.join(self._root_folder_tmp, '{}_{}'.format(basename[0], ind))
        os.mkdir(destination_path)
        shutil.copy2(original_path, destination_path)
        # shutil.copy2(original_path, destination_path)
        return os.path.join(destination_path, os.path.basename(original_path))

    def get_clean_up_function(self, copy_path):
        def clean_up_func(**kwargs):
            path = kwargs['pipeline_path']
            subs_id = kwargs['execution_name']
            if os.path.isfile(path + '.save'):
                # TODO git commit all models in file
                with open(path + '.save', 'r') as saved_models:
                    pass
                os.remove(path + '.save')
            shutil.rmtree(os.path.split(copy_path)[0])

        return clean_up_func

    def get_path(self, id):
        return self._get_rel_abs_path(id)[0]
