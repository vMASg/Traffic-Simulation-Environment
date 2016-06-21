import os
import sys
import json
import imp
from aimsun_scriptreg import get_inputs, get_outputs, get_main_class
from itertools import izip_longest as izipl

def find(f, l):
    for elem in l:
        if f(elem):
            return elem
    return None

def main(argv):
    pipeline_path = argv[1]
    with open(pipeline_path, 'r') as f:
        pipeline = json.loads(f.read())

    for script in pipeline:
        mod_name, file_ext = os.path.splitext(os.path.split(script['path'])[-1])
        imp.load_source(mod_name, script['path'])
        # Test if inputs and outputs are correctly defined
        inputs = get_inputs(script['path'])
        outputs = get_outputs(script['path'])
        if len(inputs) != len(script['inputs']) or \
           len(outputs) != len(script['outputs']) or \
           any(inp['name'] not in inputs for inp in script['inputs']) or \
           any(out['name'] not in outputs for out in script['outputs']):
           # Inputs and outputs mismatch between pipeline and script
            return 1

    # Constructing the execution graph based on the dependency graph
    execution_graph = []
    removed_nodes = []
    while len(pipeline) > len(execution_graph):
        for ind, script in enumerate(pipeline):
            if script['id'] in removed_nodes:
                continue
            inpts = filter(lambda e: e['origin'] and e['origin']['node'] not in removed_nodes, script['inputs'])
            if len(inpts) == 0:
                removed_nodes.append(script['id'])
                execution_graph.append({'script': script, 'class': get_main_class(script['path'])})

    # Execute graph
    for node in execution_graph:
        # Fetch the inputs
        values = []
        for inp in node['script']['inputs']:
            if inp['origin'] is None:
                values.append(None)
            else:
                orig = find(lambda e: e['script']['id'] == inp['origin']['node'], execution_graph)
                values.append(getattr(orig['class'], inp['origin']['connector']))

        input_names = [e['name'] for e in node['script']['inputs']]
        inputs = {k: v for k, v in zip(input_names, values)}

        # Executing node - creating obj
        instance = node['class']()

        # Executing node - executing main
        output = instance.main(**inputs)

        # Registering output
        output_names = [e['name'] for e in node['script']['outputs']]
        if len(output_names) == 1:
            setattr(node['class'], output_names[0], output)
        elif len(output_names) > 1:
            for output_name, output_value in zip(output_names, list(output)):
                setattr(node['class'], output_name, output_value)


if __name__ == '__main__':
    sys.stderr.write('READY\n')
    sys.stderr.flush()
    try:
        main(sys.argv)
    except:
        import traceback
        traceback.print_exc()
