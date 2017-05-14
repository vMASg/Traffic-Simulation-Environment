import unittest
import mock

from server.services.script_service import ScriptService, InvalidPathException

class TestScriptService(unittest.TestCase):
    """docstring for TestScriptService"""

    def __init__(self, *args, **kwargs):
        super(TestScriptService, self).__init__(*args, **kwargs)
        self.listdir_retvals = {
            'root': ['.git', 'proj_folder', 'normal_file.py', 'normal_file.pyc'],
            'root/proj_folder': ['file.py'],
            'proj_folder': ['file.py']
        }

        def new_join(*args):
            return '/'.join(list(args))

        self.new_join = new_join
        self.isdir_dirs = ['root', 'root/proj_folder', 'root/.git']


    def setUp(self):
        self.gitserv_mock = mock.Mock()

    def tearDown(self):
        self.gitserv_mock = None


    @mock.patch("server.services.script_service.BaseService.__init__")
    @mock.patch("server.services.script_service.BaseService.get_id_from_path")
    @mock.patch("server.services.script_service.os")
    def testGetScripts(self, os_mock, BaseServiceMock_idfrompath, BaseServiceMock_init):
        BaseServiceMock_init.return_value = None
        BaseServiceMock_idfrompath.return_value = 'id'

        os_mock.listdir.side_effect = lambda e: self.listdir_retvals[e]
        os_mock.path.join.side_effect = self.new_join
        os_mock.path.isdir.side_effect = lambda e: e in self.isdir_dirs
        os_mock.path.relpath.side_effect = lambda a, b: a

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

    @mock.patch("server.services.script_service.BaseService.__init__")
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    def testGetScriptContentInvalidPath(self, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.return_value = None
        BaseServiceMock_relabspath.return_value = ('/sth/sth/scr.py', '../../scr.py')
        scr = ScriptService('root', self.gitserv_mock)
        with self.assertRaises(InvalidPathException):
            scr.get_script_content('idscript')

    @mock.patch("server.services.script_service.BaseService.__init__")
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    @mock.patch("server.services.script_service.open", mock.mock_open(read_data='data'))
    def testGetScriptContentHashNone(self, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.return_value = None
        BaseServiceMock_relabspath.return_value = ('/sth/sth/root/normal_file.py', 'normal_file.py')
        scr = ScriptService('root', self.gitserv_mock)
        cnt = scr.get_script_content('idscript')
        BaseServiceMock_relabspath.assert_called_with('idscript')
        self.assertEqual(cnt, 'data')

    @mock.patch("server.services.script_service.BaseService.__init__")
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    @mock.patch("server.services.script_service.ScriptService.get_path_for_execution")
    @mock.patch("server.services.script_service.open", mock.mock_open(read_data='data'))
    @mock.patch("server.services.script_service.os")
    def testGetScriptContentWithHash(self, os_mock, ScriptService_pathexec, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.return_value = None
        BaseServiceMock_relabspath.return_value = ('/sth/sth/root/normal_file.py', 'normal_file.py')
        ScriptService_pathexec.return_value = '/sth/sth/root/path_for_execution.py'
        scr = ScriptService('root', self.gitserv_mock)
        cnt = scr.get_script_content('idscript', 'Hash')
        BaseServiceMock_relabspath.assert_called_with('idscript')
        ScriptService_pathexec.assert_called_with('idscript', 'Hash')
        self.assertEqual(cnt, 'data')
        os_mock.remove.assert_called_with('/sth/sth/root/path_for_execution.py')


if __name__ == '__main__':
    unittest.main()
