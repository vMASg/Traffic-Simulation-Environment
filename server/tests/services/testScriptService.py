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

        def base_init_side_effect(self, root_folder, git_service=None, gitignore_file=None, gitattributes_file=None, rtype="resource"):
            self.git_service = git_service
            self._root_folder_content = root_folder

        self.base_init_side_effect = base_init_side_effect


    def setUp(self):
        self.gitserv_mock = mock.Mock()

    def tearDown(self):
        self.gitserv_mock = None


    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService.get_id_from_path")
    @mock.patch("server.services.script_service.os")
    def testGetScripts(self, os_mock, BaseServiceMock_idfrompath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        BaseServiceMock_idfrompath.return_value = 'id'

        os_mock.listdir.side_effect = lambda e: self.listdir_retvals[e]
        os_mock.path.join.side_effect = self.new_join
        os_mock.path.isdir.side_effect = lambda e: e in self.isdir_dirs
        os_mock.path.relpath.side_effect = lambda a, b: a

        scr = ScriptService('root', None)
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

    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    def testGetScriptContentInvalidPath(self, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        BaseServiceMock_relabspath.return_value = ('/sth/sth/scr.py', '../../scr.py')
        scr = ScriptService('root', self.gitserv_mock)
        with self.assertRaises(InvalidPathException):
            scr.get_script_content('idscript')

    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    @mock.patch("server.services.script_service.open", mock.mock_open(read_data='data'))
    def testGetScriptContentHashNone(self, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        BaseServiceMock_relabspath.return_value = ('/sth/sth/root/normal_file.py', 'normal_file.py')
        scr = ScriptService('root', self.gitserv_mock)
        cnt = scr.get_script_content('idscript')
        BaseServiceMock_relabspath.assert_called_with('idscript')
        self.assertEqual(cnt, 'data')

    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    @mock.patch("server.services.script_service.ScriptService.get_path_for_execution")
    @mock.patch("server.services.script_service.open", mock.mock_open(read_data='data'))
    @mock.patch("server.services.script_service.os")
    def testGetScriptContentWithHash(self, os_mock, ScriptService_pathexec, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        BaseServiceMock_relabspath.return_value = ('/sth/sth/root/normal_file.py', 'normal_file.py')
        ScriptService_pathexec.return_value = '/sth/sth/root/path_for_execution.py'
        scr = ScriptService('root', self.gitserv_mock)
        cnt = scr.get_script_content('idscript', 'Hash')
        BaseServiceMock_relabspath.assert_called_with('idscript')
        ScriptService_pathexec.assert_called_with('idscript', 'Hash')
        self.assertEqual(cnt, 'data')
        os_mock.remove.assert_called_with('/sth/sth/root/path_for_execution.py')

    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    def testUpdateScriptInvalidPath(self, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        BaseServiceMock_relabspath.return_value = ('/sth/sth/scr.py', '../../scr.py')
        scr = ScriptService('root', self.gitserv_mock)
        with self.assertRaises(InvalidPathException):
            scr.update_script('idscript', 'new_content')
        self.gitserv_mock.commit_file.assert_not_called()

    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    @mock.patch("server.services.script_service.current_user")
    def testUpdateScript(self, current_user_mock, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        current_user_mock.username.return_value = 'fakeuser'
        current_user_mock.email.return_value = 'fakeuser@fakemail.com'
        BaseServiceMock_relabspath.return_value = ('/sth/sth/root/normal_file.py', 'normal_file.py')
        scr = ScriptService('root', self.gitserv_mock)
        with mock.patch("server.services.script_service.open", mock.mock_open()) as mock_open:
            scr.update_script('idscript', 'script_content')
        mock_open.assert_called_once_with('/sth/sth/root/normal_file.py', 'w')
        self.gitserv_mock.commit_file.assert_called_once()

    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    def testDeleteScriptInvalidPath(self, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        BaseServiceMock_relabspath.return_value = ('/sth/sth/scr.py', '../../scr.py')
        scr = ScriptService('root', self.gitserv_mock)
        with self.assertRaises(InvalidPathException):
            scr.delete_script('idscript')

    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    @mock.patch("server.services.script_service.BaseService._delete_resource")
    @mock.patch("server.services.script_service.os")
    def testDeleteScriptDeletesScript(self, os_mock, BaseServiceMock_delete_resource, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        BaseServiceMock_relabspath.return_value = ('/sth/sth/root/normal_file.py', 'normal_file.py')
        os_mock.path.is_file.return_value = True
        os_mock.path.split.return_value = ('/sth/sth/root', 'normal_file.py')
        scr = ScriptService('root', self.gitserv_mock)
        scr.delete_script('idscript')
        os_mock.remove.assert_has_calls([mock.call('/sth/sth/root/normal_file.py'), mock.call('/sth/sth/root/normal_file.pyc')], any_order=True)
        os_mock.removedirs.assert_called_once_with('/sth/sth/root')
        BaseServiceMock_delete_resource.assert_called_once_with('idscript')

    @unittest.skip("shouldn't call startswith")
    @mock.patch("server.services.script_service.BaseService.__init__", autospec=True)
    @mock.patch("server.services.script_service.BaseService._get_rel_abs_path")
    @mock.patch("server.services.script_service.os")
    def testDeleteScriptNonexistantScript(self, os_mock, BaseServiceMock_relabspath, BaseServiceMock_init):
        BaseServiceMock_init.side_effect = self.base_init_side_effect
        BaseServiceMock_relabspath.return_value = (None, None)
        os_mock.path.is_file.return_value = False
        scr = ScriptService('root', self.gitserv_mock)
        scr.delete_script('idscript')
        os_mock.remove.assert_not_called()
        os_mock.removedirs.assert_not_called()


if __name__ == '__main__':
    unittest.main()
