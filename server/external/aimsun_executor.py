import os
import sys
import json
import imp

import threading
import traceback

import aimsun_scriptreg

from PyANGConsole import ANGConsole
from PyANGKernel import GKSystem, GKExperiment, GKReplication, GKSimulationTask

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

    def get_id(self):
        return self.node_info['id']

    def get_input_info(self):
        return self.node_info['inputs']

    def get_input_names(self):
        return [e['name'] for e in self.node_info['inputs']]

    def get_output(self, connector):
        raise NotImplementedError

    def __call__(self):
        raise NotImplementedError

class Script(Node):
    """docstring for Script"""
    def __init__(self, node_info):
        super(Script, self).__init__(node_info)
        # self.node_info = node_info
        self.outputs = {e['name']: None for e in self.node_info['outputs']}

    def get_output(self, connector):
        return self.outputs[connector]

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
        else:
            for key, value in zip(output_names, list(output)):
                self.outputs[key] = value

class Model(Node):
    """docstring for Model"""
    def __init__(self, node_info):
        super(Model, self).__init__(node_info)
        # self.node_info = node_info
        self.outputs = {e['name']: None for e in self.node_info['outputs']}

    def get_output(self, connector):
        return self.outputs[connector]

    def __call__(self, **kwargs):
        self.outputs['id_model'] = self.node_info['path']

class PipelineNode(Node):
    """docstring for PipelineNode"""
    def __init__(self, node_info):
        super(PipelineNode, self).__init__(node_info)
        self.outputs = {e['name']: None for e in self.node_info['outputs']}

    def get_output(self, connector):
        return self.outputs[connector]

    def __call__(self, **kwargs):
        pipeline = Pipeline(self.node_info['path'])
        output = pipeline(**kwargs)

        output_names = [e['name'] for e in self.node_info['outputs']]
        for key, value in zip(output_names, output):
            self.outputs[key] = value

class OpenModel(Node):
    """docstring for OpenModel"""
    def __init__(self, node_info):
        super(OpenModel, self).__init__(node_info)
        self.outputs = {e['name']: None for e in self.node_info['outputs']}

    def get_output(self, connector):
        return self.outputs[connector]

    def __call__(self, model_path):
        console = ANGConsole()
        if not console.open(model_path):
            # TODO treat error if model cannot be opened
            pass

        model = console.getModel()
        # TODO find better way of passing console object
        model.console = console
        self.outputs['model'] = model

class CloseModel(Node):
    """docstring for CloseModel"""
    def __init__(self, node_info):
        super(CloseModel, self).__init__(node_info)
        self.outputs = {e['name']: None for e in self.node_info['outputs']}

    def get_output(self, connector):
        return self.outputs[connector]

    def __call__(self, model):
        model.console.close()

class RunSimulation(Node):
    """docstring for RunSimulation"""
    def __init__(self, node_info):
        super(RunSimulation, self).__init__(node_info)
        self.outputs = {e['name']: None for e in self.node_info['outputs']}

    def get_output(self, connector):
        return self.outputs[connector]

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
        simulator.simulate()

    def mesoscopic_simulation(self, model, replication):
        plugin = GKSystem.getSystem().getPlugin("AMesoPlugin")
        simulator = plugin.getCreateSimulator(model)
        if replication.getExperiment().getEngineMode() == GKExperiment.eOneShot:
            simulator.addSimulationTask(GKSimulationTask(replication, GKReplication.eBatch))
        else:
            # This is the case of a DUE
            simulator.addSimulationTask(GKSimulationTask(replication, GKReplication.eBatchIterative))
        simulator.simulate()

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
                inpts = filter(lambda e: e['origin'] and e['origin']['node'] not in removed_nodes, node['inputs'])
                pre = filter(lambda e: e['origin'] not in removed_nodes, node['predecessors'])
                if len(inpts) == 0 and len(pre) == 0:
                    removed_nodes.append(node['id'])
                    execution_graph.append(self._create_node(node))

        # Executing the nodes
        for node in execution_graph:
            inputs_info = node.get_input_info()
            values = []
            for inp in inputs_info:
                if inp['origin'] is None:
                    values.append(None)
                else:
                    origin_node = inp['origin']['node']
                    if origin_node is None:
                        values.append(kwargs[inp['origin']['connector']])
                    else:
                        origin = find(lambda e: e.get_id() == origin_node, execution_graph)
                        values.append(origin.get_output(inp['origin']['connector']))

            inputs = {k: v for k, v in zip(node.get_input_names(), values)}
            node(**inputs)

        # Returning pipeline outputs
        if self.pipeline['outputs']:
            retval = []
            for output in self.pipeline['outputs']['inputs']:
                if output['origin'] is None:
                    retval.append(None)
                else:
                    origin_node = output['origin']['node']
                    if origin_node is None:
                        retval.append(kwargs[output['origin']['connector']])
                    else:
                        origin = find(lambda e: e.get_id() == origin_node, execution_graph)
                        retval.append(origin.get_output(output['origin']['connector']))
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

    def _create_special_node(self, node):
        if node['path'] == '<RUN_SIMULATION>':
            return RunSimulation(node)
        elif node['path'] == '<OPEN_MODEL>':
            return OpenModel(node)
        elif node['path'] == '<CLOSE_MODEL>':
            return CloseModel(node)

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
    end_thread = threading.Event()
    t = threading.Thread(target=gibberish, args=(end_thread,))
    t.start()
    pipeline = Pipeline(argv[1])
    output = pipeline(**json_loads_byteified(argv[2] if len(argv) > 2 else '{}'))
    end_thread.set()
    t.join()


if __name__ == '__main__':
    sys.stderr.write('READY\n')
    sys.stderr.flush()
    try:
        main(sys.argv)
    except:
        traceback.print_exc()
