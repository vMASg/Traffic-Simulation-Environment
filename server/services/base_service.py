import os
from server.models.resource import ResourceModel
from server.utils.sqlalchemy import sql_alchemy_db as db

class BaseService(object):
    """docstring for BaseService"""

    def __init__(self, root_folder, git_service=None, gitignore_file=None, gitattributes_file=None, rtype="resource"):
        super(BaseService, self).__init__()
        self._rtype = rtype
        self._root_folder = root_folder if root_folder[-1] != '\\' else root_folder[:-1]
        self._root_folder_content = os.path.join(self._root_folder, 'content')
        self._root_folder_tmp = os.path.join(self._root_folder, 'tmp')
        if not os.path.isdir(self._root_folder_content):
            os.mkdir(self._root_folder_content)
        if not os.path.isdir(self._root_folder_tmp):
            os.mkdir(self._root_folder_tmp)

        if git_service is not None:
            self.git_service = git_service
            if not os.path.isdir(os.path.join(self._root_folder_content, '.git')):
                git_service.init_repo(self._root_folder_content)

                if gitignore_file is not None:
                    with open(os.path.join(self._root_folder_content, '.gitignore'), 'w') as git_ignore:
                        git_ignore.write(gitignore_file)

                if gitattributes_file is not None:
                    with open(os.path.join(self._root_folder_content, '.gitattributes'), 'w') as git_attributes:
                        git_attributes.write(gitattributes_file)

                git_service.commit_file('.', self._root_folder_content, 'auto.environ <environ@foo.com>', message='Initial commit')

    def _get_rel_abs_path(self, id):
        resource = ResourceModel.query.get(id)  # TODO: check if uuid.UUID(hex=id) is needed
        abs_path = os.path.join(self._root_folder_content, resource.location)
        relpath = os.path.relpath(os.path.normpath(abs_path), self._root_folder_content)
        return abs_path, relpath

    def _new_resource(self, location):
        resource = ResourceModel(self._rtype, location)
        db.session.add(resource)
        db.session.commit()
        return resource.id.hex

    def get_id_from_path(self, path):
        # return ResourceModel.query.filter_by(rtype=self._rtype, location=path).first().id.hex
        return ResourceModel.id_from_path(rtype=self._rtype, location=path)

    def _delete_resource(self, id):
        resource = ResourceModel.query.get(id)
        db.session.delete(resource)
        db.session.commit()
