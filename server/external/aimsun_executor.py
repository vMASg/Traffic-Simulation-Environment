import os
import sys
import json
import imp

import threading
import subprocess
import traceback
import shutil

from functools import partial

import aimsun_scriptreg

try:
    from PyANGConsole import ANGConsole
    from PyANGKernel import GKSystem, GKExperiment, GKReplication, GKSimulationTask
    PYTHON_DIR = os.getenv('PYTHONDIR')
    sys.path.append(os.path.join(PYTHON_DIR, 'Lib', 'site-packages'))
except ImportError:
    sys.path.append(os.path.join(os.getcwd(), 'server', 'external', 'fakelibs'))
    failed_import = True
else:
    failed_import = False

def find(f, l):
    for elem in l:
        if f(elem):
            return elem
    return None

class Node(object):
    """docstring for Node"""
    def __init__(self, node_info):
        super(Node, self).__init__()
        self.node_info = node_info
        self.outputs = {e['name']: None for e in self.node_info['outputs']}

    def get_id(self):
        return self.node_info['id']

    def get_input_info(self):
        return self.node_info['inputs']

    def get_input_names(self):
        return [e['name'] for e in self.node_info['inputs']]

    def get_output(self, connector):
        return self.outputs[connector]

    def __call__(self, **kwargs):
        raise NotImplementedError

    def partially_apply(self, **arguments):
        for out_name in self.outputs.iterkeys():
            self.outputs[out_name] = partial(self.partial_run(out_name), **arguments)

    def partial_run(self, output):
        def run_get_output(**kwargs):
            original_outputs = {k: v for k, v in self.outputs.iteritems()}
            self(**kwargs)
            target_output = self.outputs[output]
            self.outputs = original_outputs
            return target_output

        return run_get_output

class Script(Node):
    """docstring for Script"""
    def __call__(self, **kwargs):
        mod_name, file_ext = os.path.splitext(os.path.split(self.node_info['path'])[-1])
        if not self.node_info['path'] in aimsun_scriptreg.classregistry.packages:
            name_modifier = 2
            while mod_name in sys.modules:
                mod_name = "{}{}".format(mod_name, name_modifier)
                name_modifier += 1
            imp.load_source(mod_name, self.node_info['path'])

        # Creating instance of main class
        # Running main method and storing outputs
        instance = aimsun_scriptreg.get_main_class(self.node_info['path'])()
        output = instance.main(**kwargs)

        output_names = [e['name'] for e in self.node_info['outputs']]
        if len(output_names) == 1:
            self.outputs[output_names[0]] = output
        elif len(output_names) > 1:
            for key, value in zip(output_names, list(output)):
                self.outputs[key] = value

class Model(Node):
    """docstring for Model"""
    def __call__(self, **kwargs):
        # self.outputs['id_model'] = self.node_info['path']
        self.outputs['id_model'] = (self.node_info['path'], self.node_info['originalModelPath'])

class PipelineNode(Node):
    """docstring for PipelineNode"""
    def __call__(self, **kwargs):
        pipeline = Pipeline(self.node_info['path'])
        output = pipeline(**kwargs)

        # output_names = [e['name'] for e in self.node_info['outputs']]
        if output is not None:
            for key, value in output.iteritems():
                self.outputs[key] = value

class OpenModel(Node):
    """docstring for OpenModel"""
    def __call__(self, id_model):
        console = ANGConsole()
        if not console.open(id_model[0]):
            # TODO treat error if model cannot be opened
            pass

        model = console.getModel()
        # TODO find better way of passing console object
        model.console = console
        model.original_model_path = id_model[1]
        self.outputs['model'] = model

class CloseModel(Node):
    """docstring for CloseModel"""
    def __call__(self, model):
        model.console.close()

class SaveModel(Node):
    """docstring for SaveModel"""
    def __call__(self, model):
        model.console.save(model.getDocumentFileName())
        shutil.copy2(str(model.getDocumentFileName()), model.original_model_path)
        # TODO improve saving "signal"
        with open(sys.argv[1] + '.save', 'a') as saved_models:
            saved_models.write('{}\n'.format(model.original_model_path))

class RunSimulation(Node):
    """docstring for RunSimulation"""
    def __init__(self, node_info):
        super(RunSimulation, self).__init__(node_info)
        self._spammer = None

    def __call__(self, model, replication):
        catalog = model.getCatalog()
        repl_obj = catalog.find(replication)
        if repl_obj is not None and repl_obj.isA('GKReplication'):
            if repl_obj.getExperiment().getSimulatorEngine() == GKExperiment.eMicro:
                self.microscopic_simulation(model, repl_obj)
            elif repl_obj.getExperiment().getSimulatorEngine() == GKExperiment.eMeso:
                self.mesoscopic_simulation(model, repl_obj)

    def microscopic_simulation(self, model, replication):
        plugin = GKSystem.getSystem().getPlugin("GGetram")
        simulator = plugin.getCreateSimulator(model)
        simulator.addSimulationTask(GKSimulationTask(replication, GKReplication.eBatch))
        self._start_spammer()
        simulator.simulate()
        self._kill_spammer()

    def mesoscopic_simulation(self, model, replication):
        plugin = GKSystem.getSystem().getPlugin("AMesoPlugin")
        simulator = plugin.getCreateSimulator(model)
        if replication.getExperiment().getEngineMode() == GKExperiment.eOneShot:
            simulator.addSimulationTask(GKSimulationTask(replication, GKReplication.eBatch))
        else:
            # This is the case of a DUE
            simulator.addSimulationTask(GKSimulationTask(replication, GKReplication.eBatchIterative))
        self._start_spammer()
        simulator.simulate()
        self._kill_spammer()

    def _start_spammer(self):
        self._spammer = subprocess.Popen([os.path.join('server', 'external', 'spammer3.exe')])

    def _kill_spammer(self):
        self._spammer.kill()

class Constant(Node):
    """docstring for Constant"""
    def __init__(self, node_info):
        super(Constant, self).__init__(node_info)
        self.outputs.update(self.node_info['outputs'])

    def __call__(self, **kwargs):
        pass

class Pipeline(object):
    """docstring for Pipeline"""
    def __init__(self, pipeline_path):
        super(Pipeline, self).__init__()
        self.pipeline_path = pipeline_path

        with open(pipeline_path, 'r') as f:
            self.pipeline = json.loads(f.read())

    def __call__(self, **kwargs):
        # Constructing the execution graph based on the dependency graph
        pipeline_nodes = self.pipeline['nodes']
        execution_graph, removed_nodes = [], []
        while len(pipeline_nodes) > len(execution_graph):
            for node in pipeline_nodes:
                if node['id'] in removed_nodes:
                    continue
                inpts = filter(lambda e: e['origin'] and 'node' in e['origin'] and e['origin']['node'] not in removed_nodes, node['inputs'])
                pre = filter(lambda e: e['origin'] not in removed_nodes, node['predecessors'])
                if len(inpts) == 0 and len(pre) == 0:
                    removed_nodes.append(node['id'])
                    execution_graph.append(self._create_node(node))

        # Executing the nodes
        for node in execution_graph:
            inputs_info = node.get_input_info()
            values = []
            unconnected_inputs = []
            for inp in inputs_info:
                if inp['origin'] is None:
                    unconnected_inputs.append(inp['name'])
                    values.append(None)
                else:
                    if 'node' not in inp['origin']:
                        values.append(kwargs[inp['origin']['connector']])
                    else:
                        origin_node = inp['origin']['node']
                        origin = find(lambda e: e.get_id() == origin_node, execution_graph)
                        values.append(origin.get_output(inp['origin']['connector']))

            inputs = {k: v for k, v in zip(node.get_input_names(), values) if k not in unconnected_inputs}
            if unconnected_inputs:
                node.partially_apply(**inputs)
            else:
                node(**inputs)

        # Returning pipeline outputs
        if self.pipeline['outputs'] and self.pipeline['outputs'] is not None:
            retval = {}
            for output in self.pipeline['outputs']['inputs']:
                if output['origin'] is None:
                    retval[output['name']] = None
                else:
                    if 'node' not in output['origin']:
                        retval[output['name']] = kwargs[output['origin']['connector']]
                    else:
                        origin_node = output['origin']['node']
                        origin = find(lambda e: e.get_id() == origin_node, execution_graph)
                        retval[output['name']] = origin.get_output(output['origin']['connector'])
            return retval

    def _create_node(self, node):
        if node['type'] == 'code':
            return Script(node)
        elif node['type'] == 'model':
            return Model(node)
        elif node['type'] == 'pipeline':
            return PipelineNode(node)
        elif node['type'] == 'special':
            return self._create_special_node(node)
        else:
            raise Exception("Unrecognized type {}".format(node['type']))

    def _create_special_node(self, node):
        if node['path'] == '<RUN_SIMULATION>':
            return RunSimulation(node)
        elif node['path'] == '<OPEN_MODEL>':
            return OpenModel(node)
        elif node['path'] == '<CLOSE_MODEL>':
            return CloseModel(node)
        elif node['path'] == '<SAVE_MODEL>':
            return SaveModel(node)
        elif node['path'] == '<CONSTANT>':
            return Constant(node)
        else:
            raise Exception("Unrecognized special node {}".format(node['path']))

def gibberish(end):
    event = threading.Event()
    while not end.is_set():
        event.wait(0.5)
        sys.stderr.write('[WKUP]\n')
        sys.stderr.flush()

def json_loads_byteified(json_text):
    "Decodes json as bytes (str) instead of unicode objects.\
    Based in answer: http://stackoverflow.com/a/33571117"

    def _byteify(data, ignore_dicts=False):
        # if this is a unicode string, return its string representation
        if isinstance(data, unicode):
            return data.encode('utf-8')
        # if this is a list of values, return list of byteified values
        if isinstance(data, list):
            return [_byteify(item, ignore_dicts=True) for item in data]
        # if this is a dictionary, return dictionary of byteified keys and values
        # but only if we haven't already byteified it
        if isinstance(data, dict) and not ignore_dicts:
            return {
                _byteify(key, ignore_dicts=True): _byteify(value, ignore_dicts=True)
                for key, value in data.iteritems()
            }
        # if it's anything else, return it in its original form
        return data

    return _byteify(
        json.loads(json_text, object_hook=_byteify),
        ignore_dicts=True
    )


def main(argv):
    pipeline = Pipeline(argv[1])
    content = '{}'
    if len(argv) > 2 and argv[2] != '-':
        with open(argv[2], 'r') as inp:
            content = inp.read()

    output = pipeline(**json_loads_byteified(content))
    if len(argv) > 3 and argv[3] != '-':
        with open(argv[3], 'w') as out:
            out.write(json.dumps(output))

    return output


if __name__ == '__main__':
    sys.stderr.write('READY\n')
    sys.stderr.flush()
    end_thread = threading.Event()
    t = threading.Thread(target=gibberish, args=(end_thread,))
    t.start()
    try:
        main(sys.argv)
    except:
        traceback.print_exc()

    end_thread.set()
    t.join()
