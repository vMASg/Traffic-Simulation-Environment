import json
import os
import sys
import subprocess

class Configuration(object):
    """docstring for Configuration"""
    def __init__(self, config_file_path):
        super(Configuration, self).__init__()
        def get_location(program):
            try:
                return subprocess.check_output(['which', program])
            except subprocess.CalledProcessError:
                return ''

        self.config_file_path = config_file_path
        self.data = {
            'BASE_PATH': '/var/traffic-simulation-environment/',
            'ACONSOLE_PATH': get_location('aconsole'),
            'GIT_PATH': get_location('git'),
            'PYTHON_DIR': os.path.split(get_location('python'))[0],
            'SECRET_KEY': '441c0f440949e5223213f96866e29f2207a4055d43ce1b13',
            'ADMIN_PASSWORD': 'changemeNOW'
        }
        self.config_opened = False
        self.config_loaded = False
        try:
            with open(config_file_path, 'r') as inp:
                self.data.update(json.loads(inp.read()))
        except IOError:
            pass
        except json.JSONDecodeError:
            self.config_opened = True
        else:
            self.config_opened = True
            self.config_loaded = True

    def write_config(self):
        try:
            with open(self.config_file_path, 'w') as out:
                out.write(json.dumps(self.data, indent=4))
        except IOError:
            error = True
        else:
            error = False
        return not error

config = Configuration(os.environ.get('CONFIG_FILE', '/etc/traffic-simulation-environment/server-conf.json'))
