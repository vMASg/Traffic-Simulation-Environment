import os
import sys
import imp
import inspect
import json
import aimsun_scriptreg

def get_script_type(filepath):
    if aimsun_scriptreg.is_python_script(filepath):
        return 'PythonScript'
    else:
        return 'AconsoleScript'

def main(argv):
    if len(argv) < 2:
        return 1
    sys.path.append(os.path.join(os.getcwd(), 'server', 'external', 'fakelibs'))
    filepath = argv[1]
    mod_name, file_ext = os.path.splitext(os.path.split(filepath)[-1])
    try:
        py_mod = imp.load_source(mod_name, filepath)
    except IOError:
        return 1
    inputs = aimsun_scriptreg.get_inputs(filepath)
    if inputs is None:
        return 1
    outputs = aimsun_scriptreg.get_outputs(filepath)

    print json.dumps({
        'inputs': list(inputs),
        'outputs': list(outputs),
        'script_type': get_script_type(filepath),
        'requires_model': aimsun_scriptreg.requires_model(filepath)
    })
    # print ','.join([str(k) for k in list(inputs)])
    # print ','.join([str(k) for k in list(outputs)])
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
