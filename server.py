#!/usr/bin/env python
import os
from server.app_starter import AppStarter
from server.app_setup import InitialSetup
from server.constants import config

if not config.config_opened or not config.config_loaded:
    print("Configuration could not be read. open: {}, load: {}".format(config.config_opened, config.config_loaded))
    static_folder_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "client", "app-setup")
    app = InitialSetup(static_folder_root)
else:
    static_folder_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "client", "app")
    app = AppStarter(static_folder_root)
    app.register_routes_to_resources(static_folder_root)

app.run(__name__)
