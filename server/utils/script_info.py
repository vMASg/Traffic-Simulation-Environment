import subprocess
import json

class ScriptInfo(object):
    """docstring for ScriptInfo"""
    def __init__(self, script_path):
        super(ScriptInfo, self).__init__()
        self.script_path = script_path
        cmd = subprocess.Popen(['python', 'server\\external\\get_input_output.py', script_path], stdout=subprocess.PIPE)
        ret = cmd.wait()
        if ret != 0:
            self.info = type('NoneDict', (object,), {'__getitem__': lambda s, e: None})()
        else:
            retval = cmd.communicate()[0]
            self.info = json.loads(retval)

    def get_inputs_outputs(self):
        # inputs  = [a.strip() for a in retval[0].split(',') if a.strip() != '']
        # outputs = [a.strip() for a in retval[1].split(',') if a.strip() != '']
        return self.info['inputs'], self.info['outputs']

    def get_script_type(self):
        return self.info['script_type']

    def requires_model(self):
        return self.info['requires_model']
