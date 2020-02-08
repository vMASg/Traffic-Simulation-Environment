import os
from flask import Flask, render_template, send_from_directory, redirect
from forms import ConfigSetupForm
from constants import config

class InitialSetup(object):
    """docstring for InitialSetup"""
    def __init__(self, static_file_path):
        self._static_files_root_folder_path = static_file_path
        self._app = Flask(__name__, template_folder=static_file_path, static_folder=static_file_path, static_url_path='')
        self._app.config['SECRET_KEY'] = config.data['SECRET_KEY']
        self._app.add_url_rule('/', 'config', self._config_request, methods=['GET', 'POST'])
        self._app.add_url_rule('/css/bootstrap.min.css', 'load_bootstrap', self._load_bootstrap, methods=['GET'])

    def _config_request(self):
        form = ConfigSetupForm()
        if form.validate_on_submit():
            config.data.update({
                'BASE_PATH': form.basepath.data,
                'ACONSOLE_PATH': form.aconsole.data,
                'GIT_PATH': form.git_path.data,
                'PYTHON_DIR': form.pythondir.data,
                'SECRET_KEY': form.secret_k.data,
                'ADMIN_PASSWORD': form.adminpass.data
            })
            if config.write_config():
                return redirect('/success.html')
            else:
                return redirect('/error.html')

        return render_template('index.html', form=form, config=config.data, config_file=config.config_file_path)

    def _load_bootstrap(self):
        bootstrap_static = os.path.normpath(os.path.join(self._static_files_root_folder_path, '..', 'app'))
        return send_from_directory(bootstrap_static, 'css/bootstrap.min.css')

    def run(self, module_name):
        if module_name == '__main__':
            self._app.run(debug=True, host="0.0.0.0", port=8000)
            # self._app.run(self._app, debug=True, port=8000)
