from subprocess import Popen, STDOUT
import os

class GitService(object):
    """docstring for GitService"""
    def __init__(self, git_location):
        super(GitService, self).__init__()
        self.git_location = git_location

    def init_repo(self, directory):
        with open(os.devnull, 'w') as devnull:
            Popen(
                [
                    self.git_location,
                    'init',
                    directory
                ],
                stdout=devnull, stderr=STDOUT).wait()

    def commit_file(self, file_path, repo_dir, author):
        with open(os.devnull, 'w') as devnull:
            Popen(
                [
                    self.git_location,
                    '--git-dir={}'.format(repo_dir),
                    'add',
                    file_path
                ],
                stdout=devnull, stderr=STDOUT).wait()

            Popen(
                [
                    self.git_location,
                    '--git-dir={}'.format(repo_dir),
                    'commit',
                    '-m',
                    '',
                    '--allow-empty-message',
                    '--author={}'.format(author)
                ],
                stdout=devnull, stderr=STDOUT).wait()
