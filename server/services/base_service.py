import os
import re
from collections import namedtuple
from flask_login import current_user
from server.exceptions import InvalidPathException
from server.models.resource import ResourceModel
from server.utils.sqlalchemy import sql_alchemy_db as db
from sqlalchemy.exc import IntegrityError

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
        if resource is None:
            return None, None
        abs_path = os.path.join(self._root_folder_content, resource.location)
        relpath = os.path.relpath(os.path.normpath(abs_path), self._root_folder_content)
        return abs_path, relpath

    def _new_resource(self, location):
        try:
            resource = ResourceModel(self._rtype, location)
            db.session.add(resource)
            db.session.commit()
            return resource.id.hex
        except IntegrityError:
            return None

    def get_id_from_path(self, path):
        # return ResourceModel.query.filter_by(rtype=self._rtype, location=path).first().id.hex
        return ResourceModel.id_from_path(rtype=self._rtype, location=path)

    def _delete_resource(self, id):
        resource = ResourceModel.query.get(id)
        if resource is not None:
            db.session.delete(resource)
            db.session.commit()

## Further common methods

    def get_resources(self, folder_name, exceptions=[r'\.\w+']):
        return_type = namedtuple('ResourceLocator', ['name', 'type', 'id', 'path', 'children'])
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
        return [return_type(folder_name, 'group', self.get_id_from_path('.'), '.', children)]

    def update_resource(self, id, content):
        abs_path, relpath = self._get_rel_abs_path(id)
        if not relpath.startswith('..'):
            with open(abs_path, 'w') as file:
                file.write(content)
            author = '{} <{}>'.format(current_user.username, current_user.email)
            message = 'Committing {}'.format(relpath)
            self.git_service.commit_file(abs_path, self._root_folder_content, author, message=message)
        else:
            raise InvalidPathException()

    def delete_resource(self, id):
        abs_path, relpath = self._get_rel_abs_path(id)
        if abs_path is not None:
            if not relpath.startswith('..'):
                try:
                    self._delete_resource(id)
                    os.remove(abs_path)
                    os.removedirs(os.path.split(abs_path)[0])
                except OSError:
                    pass
            else:
                raise InvalidPathException()

    def create_resource(self, name, parent, content):
        path = os.path.normpath(os.path.join(self._root_folder_content, parent, name))
        rel_path = os.path.relpath(path, self._root_folder_content)
        id = self._new_resource(rel_path)
        if id is not None:
            parent_folder = os.path.split(path)[0]
            if not os.path.isdir(parent_folder):
                os.makedirs(parent_folder)
            self.update_resource(id, content)
        return id, rel_path, os.path.basename(rel_path), content
