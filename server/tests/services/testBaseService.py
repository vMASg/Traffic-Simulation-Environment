import unittest
import os
import shutil
import tempfile
from flask import Flask
from server.utils.sqlalchemy import sql_alchemy_db as db
from server.services.base_service import BaseService


class TestBaseService(unittest.TestCase):
    """docstring for TestBaseService"""

    def _create_app(self):
        self.app = Flask(__name__)
        fd, self.sqlite_path = tempfile.mkstemp()
        self.tmpdir = tempfile.mkdtemp()
        os.close(fd)
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///{}'.format(self.sqlite_path)
        self.app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        self.app.config['SQLALCHEMY_ECHO'] = False
        db.init_app(self.app)
        with self.app.app_context():
            db.create_all()

    def setUp(self):
        self._create_app()

    def tearDown(self):
        os.remove(self.sqlite_path)
        shutil.rmtree(self.tmpdir)

    def testBaseServiceCreatesStructureNoGit(self):
        bs = BaseService(self.tmpdir)
        content = frozenset(os.listdir(self.tmpdir))
        self.assertEqual(content, frozenset(['content', 'tmp']))


if __name__ == '__main__':
    unittest.main()
