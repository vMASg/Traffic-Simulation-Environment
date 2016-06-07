from flask import Flask, send_from_directory
from flask_restful import Resource, Api
from flask_socketio import SocketIO
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
from server.subscription import Subscription
# Constants
from server.constants import SCRIPTS_ROOT_FOLDER, PIPELINES_ROOT_FOLDER, MODELS_ROOT_FOLDER, ACONSOLE_PATH, AIMSUN_SCRIPT_PATH

class AppStarter(Resource):
    """Based in solution http://stackoverflow.com/a/29521067"""

    def __init__(self):
        # super(AppStarter, self).__init__()
        self._static_files_root_folder_path = ''
        self._app = Flask(__name__)
        self._api = Api(self._app)
        self._socketio = SocketIO(self._app)
        self._subscription = Subscription(self._socketio, '/subscription')

    def _register_static_server(self, static_files_root_folder_path):
        self._static_files_root_folder_path = static_files_root_folder_path
        self._app.add_url_rule('/<path:file_relative_path_to_root>', 'serve_page', self._serve_page, methods=['GET'])
        self._app.add_url_rule('/', 'index', self._goto_index, methods=['GET'])

    def register_routes_to_resources(self, static_files_root_folder_path):
        self._register_static_server(static_files_root_folder_path)
        # TODO: update resources
        script_service = ScriptService(root_folder=SCRIPTS_ROOT_FOLDER)
        pipeline_service = PipelineService(root_folder=PIPELINES_ROOT_FOLDER)
        model_service = ModelService(root_folder=MODELS_ROOT_FOLDER)
        aimsun_service = AimsunService(ACONSOLE_PATH, AIMSUN_SCRIPT_PATH)
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
        pipeline_executor = PipelineExecutor(aimsun_service, pipeline_service, script_service)
        self._app.add_url_rule('/pipelines/<id>/run', 'run_pipeline', pipeline_executor.run_pipeline, methods=['GET', 'POST'])

    def _goto_index(self):
        return self._serve_page("index.html")

    def _serve_page(self, file_relative_path_to_root):
        return send_from_directory(self._static_files_root_folder_path, file_relative_path_to_root)

    def run(self, module_name):
        if module_name == '__main__':
            # self._socketio.run(self._app, debug=True, host="0.0.0.0", port=8000)
            self._socketio.run(self._app, debug=True, port=8000)
