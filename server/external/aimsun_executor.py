import os
import sys
import json
import imp

def main(argv):
    pipeline_path = argv[1]
    with open(pipeline_path, 'r') as f:
        pipeline = json.loads(f.read())

    root_node = []
    for script in pipeline:
        mod_name, file_ext = os.path.splitext(os.path.split(script.path)[-1])
        imp.load_source(mod_name, script.path)

if __name__ == '__main__':
    sys.exit(main())
