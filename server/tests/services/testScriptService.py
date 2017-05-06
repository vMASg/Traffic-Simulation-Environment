import unittest
import mock

import os
from server.services.script_service import ScriptService

class TestScriptService(unittest.TestCase):
    """docstring for TestScriptService"""

    @mock.patch("server.services.script_service.BaseService.__init__")
    @mock.patch("server.services.script_service.BaseService.get_id_from_path")
    @mock.patch("os.path.relpath")
    @mock.patch("os.path.isdir")
    @mock.patch("os.path.join")
    @mock.patch("os.listdir")
    def testGetScripts(self, listdir_mock, pathjoin_mock, pathisdir_mock, relpath_mock, BaseServiceMock_idfrompath, BaseServiceMock_init):
        BaseServiceMock_init.return_value = None
        BaseServiceMock_idfrompath.return_value = 'id'
        listdir_retvals = {
            'root': ['.git', 'proj_folder', 'normal_file.py', 'normal_file.pyc'],
            'root/proj_folder': ['file.py'],
            'proj_folder': ['file.py']
        }
        listdir_mock.side_effect = lambda e: listdir_retvals[e]
        def new_join(*args):
            return '/'.join(list(args))
        pathjoin_mock.side_effect = new_join
        isdir_dirs = ['root', 'root/proj_folder', 'root/.git']
        pathisdir_mock.side_effect = lambda e: e in isdir_dirs
        relpath_mock.side_effect = lambda a, b: a

        scr = ScriptService('root', None)
        scr._root_folder_content = 'root'
        scripts = scr.get_scripts()
        expected = [
            ('Scripts', 'group', 'id', '.', [
                ('proj_folder', 'group', 'id', 'root/proj_folder', [
                    ('file.py', 'file', 'id', 'root/proj_folder/file.py', None)
                ]),
                ('normal_file.py', 'file', 'id', 'root/normal_file.py', None)
            ])
        ]
        self.assertEqual(scripts, expected)
