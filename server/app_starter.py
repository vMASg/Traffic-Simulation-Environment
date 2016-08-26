import os
import eventlet
from flask import Flask, send_from_directory, redirect, url_for, render_template
from flask_restful import Resource, Api
from flask_socketio import SocketIO, disconnect
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
# Forms
from server.forms import UsernamePasswordForm
# Resources
from server.resources.script_collection import ScriptCollection
from server.resources.script import Script
from server.resources.pipeline_collection import PipelineCollection
from server.resources.pipeline import Pipeline
from server.resources.model_collection import ModelCollection
from server.resources.model import Model
from server.resources.pipeline_executor import PipelineExecutor
# Services
from server.services.script_service import ScriptService
from server.services.pipeline_service import PipelineService
from server.services.model_service import ModelService
from server.services.aimsun_service import AimsunService
from server.services.git_service import GitService
from server.subscription import Subscription
# Constants
from server.constants import ACONSOLE_PATH, GIT_PATH, BASE_PATH, SECRET_KEY

SCRIPTS_ROOT_FOLDER = os.path.join(BASE_PATH, 'Scripts')
MODELS_ROOT_FOLDER = os.path.join(BASE_PATH, 'Models')
PIPELINES_ROOT_FOLDER = os.path.join(BASE_PATH, 'Pipelines')

sql_alchemy_db = SQLAlchemy()
login_manager = LoginManager()

from server.resources.user import User

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class AppStarter(Resource):
    """Based in solution http://stackoverflow.com/a/29521067"""

    def __init__(self, app_path):
        # Creating default folders for Resources
        AppStarter._create_folder_if_nonexistent(SCRIPTS_ROOT_FOLDER)
        AppStarter._create_folder_if_nonexistent(MODELS_ROOT_FOLDER)
        AppStarter._create_folder_if_nonexistent(PIPELINES_ROOT_FOLDER)
        # Initializing app
        self._static_files_root_folder_path = ''
        self._app = Flask(__name__, template_folder=app_path)
        self._app.config['SECRET_KEY'] = SECRET_KEY
        self._api = Api(self._app)
        self._app.config['ERROR_404_HELP'] = False
        eventlet.monkey_patch(os=False)
        # SocketIO init
        self._socketio = SocketIO(self._app, async_mode='eventlet')
        self._subscription = Subscription(self._socketio, '/subscription')
        # Bcrypt
        self._bcrypt = Bcrypt(self._app)
        User.bcrypt = self._bcrypt
        # SQLAlchemy init
        self._app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///{}'.format(os.path.join(BASE_PATH, 'database.sqlite'))
        self._app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        self._app.config['SQLALCHEMY_ECHO'] = False
        sql_alchemy_db.init_app(self._app)
        self._app.app_context().push()
        sql_alchemy_db.create_all()
        self._create_default_user()
        # Flask-Login
        login_manager.init_app(self._app)
        login_manager.login_view = 'login'

    @staticmethod
    def _create_folder_if_nonexistent(path):
        if not os.path.exists(path):
            os.mkdir(path)

    def _create_default_user(self):
        if User.query.filter_by(username=u'Admin').first() is None:
            admin = User(u'Admin', None, 'pass')
            sql_alchemy_db.session.add(admin)
            sql_alchemy_db.session.commit()
        if User.query.filter_by(username=u'victor.mas').first() is None:
            user1 = User(u'victor.mas', None, '1234')
            sql_alchemy_db.session.add(user1)
            sql_alchemy_db.session.commit()

    def _register_static_server(self, static_files_root_folder_path):
        self._static_files_root_folder_path = static_files_root_folder_path
        self._app.add_url_rule('/css/bootstrap.min.css', 'load_bootstrap', self._load_bootstrap, methods=['GET'])
        self._app.add_url_rule('/js/lib/firebase-socketio.js', 'load_firebase-socketio', self._load_firebasesockeio, methods=['GET'])
        self._app.add_url_rule('/<path:file_relative_path_to_root>', 'serve_page', self._serve_page, methods=['GET'])
        self._app.add_url_rule('/', 'index', self._goto_index, methods=['GET'])

    def _add_login_logout_routes(self):
        self._app.add_url_rule('/login', 'login', self._login, methods=['GET', 'POST'])
        self._app.add_url_rule('/logout', 'logout', self._logout, methods=['GET', 'POST'])

    def register_routes_to_resources(self, static_files_root_folder_path):
        self._add_login_logout_routes()
        self._register_static_server(static_files_root_folder_path)
        # TODO: update resources
        git_service = GitService(GIT_PATH or 'git')
        script_service = ScriptService(root_folder=SCRIPTS_ROOT_FOLDER, git_service=git_service)
        pipeline_service = PipelineService(root_folder=PIPELINES_ROOT_FOLDER, git_service=git_service)
        model_service = ModelService(root_folder=MODELS_ROOT_FOLDER, git_service=git_service)
        aimsun_service = AimsunService(ACONSOLE_PATH)
        self._api.add_resource(ScriptCollection, '/scripts', resource_class_kwargs={'script_locator': script_service, 'subscription_service': self._subscription})
        self._api.add_resource(Script, '/scripts/<id>', resource_class_kwargs={'script_locator': script_service, 'subscription_service': self._subscription})
        self._api.add_resource(PipelineCollection, '/pipelines', resource_class_kwargs={'pipeline_locator': pipeline_service, 'subscription_service': self._subscription})
        self._api.add_resource(Pipeline, '/pipelines/<id>', resource_class_kwargs={'pipeline_locator': pipeline_service, 'subscription_service': self._subscription})
        self._api.add_resource(ModelCollection, '/models', resource_class_kwargs={'model_locator': model_service, 'aimsun_service': aimsun_service})
        # Non RESTful routes

        # Model
        model = Model(aimsun_service, model_service, script_service)
        self._app.add_url_rule('/models/<id>/runscript', 'run_script', model.run_script, defaults={'script_id': None}, methods=['GET', 'POST'])
        self._app.add_url_rule('/models/<id>/runscript/<script_id>', 'run_script', model.run_script, methods=['GET', 'POST'])

        # Pipeline
        pipeline_executor = PipelineExecutor(aimsun_service, pipeline_service, script_service, model_service, self._subscription)
        self._app.add_url_rule('/pipelines/<id>/run', 'run_pipeline', pipeline_executor.run_pipeline, methods=['GET', 'POST'])

    def _login(self):
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        form = UsernamePasswordForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user is not None and user.password_matches(form.password.data):
                login_user(user)
                return redirect(url_for('index'))

        return render_template('login.html', form=form)

    def _logout(self):
        # disconnect()
        logout_user()
        return redirect(url_for('login'))

    def _load_bootstrap(self):
        return send_from_directory(self._static_files_root_folder_path, 'css/bootstrap.min.css')

    @login_required
    def _load_firebasesockeio(self):
        return render_template('js/lib/firebase-socketio.js')

    @login_required
    def _goto_index(self):
        return self._serve_page("index.html")

    @login_required
    def _serve_page(self, file_relative_path_to_root):
        return send_from_directory(self._static_files_root_folder_path, file_relative_path_to_root)

    def run(self, module_name):
        if module_name == '__main__':
            # self._socketio.run(self._app, debug=True, host="0.0.0.0", port=8000)
            self._socketio.run(self._app, debug=True, port=8000)
