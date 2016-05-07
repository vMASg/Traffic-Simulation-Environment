from flask import Flask, send_from_directory
from flask_restful import Resource, Api
from resources.script_collection import ScriptCollection
from resources.script import Script
from services.script_service import ScriptService

ROOT_FOLDER = r'F:\Uni\TFG\traffic-simulation-environment'

class AppStarter(Resource):
    """Based in solution http://stackoverflow.com/a/29521067"""
    def __init__(self):
        # super(AppStarter, self).__init__()
        self._static_files_root_folder_path = ''
        self._app = Flask(__name__)
        self._api = Api(self._app)
    
    def _register_static_server(self, static_files_root_folder_path):
        self._static_files_root_folder_path = static_files_root_folder_path
        self._app.add_url_rule('/<path:file_relative_path_to_root>', 'serve_page', self._serve_page, methods=['GET'])
        self._app.add_url_rule('/', 'index', self._goto_index, methods=['GET'])

    def register_routes_to_resources(self, static_files_root_folder_path):
        self._register_static_server(static_files_root_folder_path)
        # TODO: update resources
        script_service = ScriptService(root_folder=ROOT_FOLDER)
        self._api.add_resource(ScriptCollection, '/scripts', resource_class_kwargs={'script_locator': script_service})
        self._api.add_resource(Script, '/scripts/<path:id>', resource_class_kwargs={'script_locator': script_service})

    def _goto_index(self):
        return self._serve_page("index.html")

    def _serve_page(self, file_relative_path_to_root):
        return send_from_directory(self._static_files_root_folder_path, file_relative_path_to_root)

    def run(self, module_name):
        if module_name == '__main__':
            self._app.run(debug=True)
