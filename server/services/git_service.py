from subprocess import Popen, STDOUT, PIPE
from threading import Lock
from time import sleep
import os

from server.exceptions import LockException

def mutex(func):
    def decorated(*args, **kwargs):
        self = args[0]
        max_attempts = 3
        attempts = 0
        while attempts < max_attempts and not self.lock.acquire(False):
            sleep(0.05)
            attempts += 1

        if attempts == max_attempts:
            raise LockException()

        retval = func(*args, **kwargs)
        self.lock.release()
        return retval

    return decorated


class GitService(object):
    """docstring for GitService"""
    def __init__(self, git_location):
        super(GitService, self).__init__()
        self.git_location = git_location
        self.lock = Lock()


    @mutex
    def init_repo(self, repo_dir):
        with open(os.devnull, 'w') as devnull:
            cmd = Popen(
                [
                    self.git_location,
                    'init',
                    repo_dir
                ],
                stdout=devnull, stderr=STDOUT)

            retcode = cmd.poll()
            while retcode is None:
                sleep(0.05)
                retcode = cmd.poll()

            cmd = Popen(
                [
                    self.git_location,
                    '--git-dir={}'.format(os.path.join(repo_dir, '.git')),
                    '--work-tree={}'.format(repo_dir),
                    'config',
                    'user.name',
                    'auto.environ'
                ],
                stdout=devnull, stderr=STDOUT)

            retcode = cmd.poll()
            while retcode is None:
                sleep(0.05)
                retcode = cmd.poll()

            cmd = Popen(
                [
                    self.git_location,
                    '--git-dir={}'.format(os.path.join(repo_dir, '.git')),
                    '--work-tree={}'.format(repo_dir),
                    'config',
                    'user.email',
                    'environ@foo.com'
                ],
                stdout=devnull, stderr=STDOUT)

            retcode = cmd.poll()
            while retcode is None:
                sleep(0.05)
                retcode = cmd.poll()

    @mutex
    def commit_file(self, file_path, repo_dir, author, message=''):
        with open(os.devnull, 'w') as devnull:
            cmd = Popen(
                [
                    self.git_location,
                    '--git-dir={}'.format(os.path.join(repo_dir, '.git')),
                    '--work-tree={}'.format(repo_dir),
                    'add',
                    file_path
                ],
                stdout=devnull, stderr=STDOUT)

            retcode = cmd.poll()
            while retcode is None:
                sleep(0.05)
                retcode = cmd.poll()

            cmd = Popen(
                [
                    self.git_location,
                    '--git-dir={}'.format(os.path.join(repo_dir, '.git')),
                    '--work-tree={}'.format(repo_dir),
                    'commit',
                    '-m',
                    message,
                    '--allow-empty-message',
                    '--author={}'.format(author)
                ],
                stdout=devnull, stderr=STDOUT)

            retcode = cmd.poll()
            while retcode is None:
                sleep(0.05)
                retcode = cmd.poll()

    @mutex
    def get_revision_hashes(self, file_path, repo_dir):
        cmd = Popen(
            [
                self.git_location,
                '--no-pager',
                '--git-dir={}'.format(os.path.join(repo_dir, '.git')),
                '--work-tree={}'.format(repo_dir),
                'log',
                '--format=%H~%an <%ae>~%at',
                # '-n',
                # '1',
                '--',
                file_path
            ],
            stdout=PIPE, stderr=STDOUT)

        retcode = cmd.poll()
        while retcode is None:
            sleep(0.05)
            retcode = cmd.poll()

        return [hash.strip().split('~')[0] for hash in cmd.stdout.readlines() if len(hash.strip()) > 0]

    @mutex
    def get_content(self, file_path, repo_dir, hash):
        cmd = Popen(
            [
                self.git_location,
                '--no-pager',
                '--git-dir={}'.format(os.path.join(repo_dir, '.git')),
                '--work-tree={}'.format(repo_dir),
                'show',
                '{}:{}'.format(hash, os.path.relpath(file_path, repo_dir).replace('\\', '/'))
            ],
            stdout=PIPE, stderr=STDOUT)

        retcode = cmd.poll()
        while retcode is None:
            sleep(0.05)
            retcode = cmd.poll()

        return cmd.stdout.read().strip()
