import unittest
import os
import shutil
import tempfile
from mock import Mock
from flask import Flask
from server.utils.sqlalchemy import sql_alchemy_db as db
from server.services.base_service import BaseService
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.exc import UnmappedInstanceError


class TestBaseService(unittest.TestCase):
    """docstring for TestBaseService"""

    def _create_app(self):
        self.app = Flask(__name__)
        fd, self.sqlite_path = tempfile.mkstemp()
        self.tmpdir = tempfile.mkdtemp()
        os.close(fd)
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///{}'.format(self.sqlite_path)
        self.app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        self.app.config['SQLALCHEMY_ECHO'] = False
        db.init_app(self.app)
        self.app.app_context().push()
        db.create_all()

    def setUp(self):
        self._create_app()
        self.gitservice_mock = Mock()

    def tearDown(self):
        os.remove(self.sqlite_path)
        self.sqlite_path = None
        shutil.rmtree(self.tmpdir)
        db.session.remove()
        db.drop_all()
        self.gitservice_mock = None

    def testCreatesStructureNoGit(self):
        BaseService(self.tmpdir)
        content = frozenset(os.listdir(self.tmpdir))
        self.assertEqual(content, frozenset(['content', 'tmp']))

    def testCreatesGitFolderNogitignoreNogitattributes(self):
        BaseService(self.tmpdir, git_service=self.gitservice_mock)
        content_folder = os.path.join(self.tmpdir, 'content')
        self.gitservice_mock.init_repo.assert_called_once_with(content_folder)
        self.gitservice_mock.commit_file.assert_called_once_with('.', content_folder, 'auto.environ <environ@foo.com>', message='Initial commit')
        content_content_folder = os.listdir(content_folder)
        self.assertNotIn('.gitignore', content_content_folder)
        self.assertNotIn('.gitattributes', content_content_folder)

    def testDoesntCreateNewRepoOrFilesIfAlreadyExist(self):
        content_folder = os.path.join(self.tmpdir, 'content')
        os.mkdir(content_folder)
        os.mkdir(os.path.join(content_folder, '.git'))
        os.mkdir(os.path.join(self.tmpdir, 'tmp'))
        BaseService(self.tmpdir, git_service=self.gitservice_mock)
        self.gitservice_mock.init_repo.assert_not_called()
        self.gitservice_mock.commit_file.assert_not_called()
        self.assertFalse(os.path.isfile(os.path.join(content_folder, '.gitignore')))
        self.assertFalse(os.path.isfile(os.path.join(content_folder, '.gitattributes')))

    def testCreatesAllFilesWithContent(self):
        content_folder = os.path.join(self.tmpdir, 'content')
        gitignore, gitattr = os.path.join(content_folder, '.gitignore'), os.path.join(content_folder, '.gitattributes')
        BaseService(self.tmpdir, git_service=self.gitservice_mock, gitignore_file='gitignore content', gitattributes_file='gitattributes content')
        self.assertTrue(os.path.isfile(gitignore))
        self.assertTrue(os.path.isfile(gitattr))
        with open(gitignore, 'r') as gitignore_file, open(gitattr, 'r') as gitattr_file:
            ign_content, attr_content = gitignore_file.read(), gitattr_file.read()

        self.assertEqual(ign_content, 'gitignore content')
        self.assertEqual(attr_content, 'gitattributes content')

    def testNewResource(self):
        content_folder = os.path.join(self.tmpdir, 'content')
        resource_path = os.path.join(content_folder, 'new_resource')
        bs = BaseService(self.tmpdir)
        resource_id = bs._new_resource(resource_path)
        abs_path, rel_path = bs._get_rel_abs_path(resource_id)
        self.assertEqual(resource_id, bs.get_id_from_path(resource_path))
        self.assertEqual(abs_path, resource_path)
        self.assertEqual(rel_path, os.path.relpath(resource_path, start=content_folder))

    def testCreateResourceTwiceThrowsIntegrityError(self):
        resource_path = os.path.join(self.tmpdir, 'content', 'new_resource')
        bs = BaseService(self.tmpdir)
        bs._new_resource(resource_path)
        with self.assertRaises(IntegrityError):
            bs._new_resource(resource_path)

    def testCreateResourceDeleteitRecreateSameResource(self):
        resource_path = os.path.join(self.tmpdir, 'content', 'new_resource')
        bs = BaseService(self.tmpdir)
        rid = bs._new_resource(resource_path)
        bs._delete_resource(rid)
        nid = bs._new_resource(resource_path)
        self.assertEqual(rid, nid)

    def testDeleteResourceTwice(self):
        # TODO shouldn't raise exception
        resource_path = os.path.join(self.tmpdir, 'content', 'new_resource')
        bs = BaseService(self.tmpdir)
        rid = bs._new_resource(resource_path)
        bs._delete_resource(rid)
        with self.assertRaises(UnmappedInstanceError):
            bs._delete_resource(rid)


if __name__ == '__main__':
    unittest.main()
