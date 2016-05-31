import os
import sys
import imp
import inspect
import aimsun_executor

def main(argv):
    if len(argv) < 2:
        return 1
    filepath = argv[1]
    mod_name, file_ext = os.path.splitext(os.path.split(filepath)[-1])
    try:
        py_mod = imp.load_source(mod_name, filepath)
    except IOError:
        return 1
    inputs = aimsun_executor.get_inputs(argv[1])
    if inputs is None:
        return 1
    outputs = aimsun_executor.get_outputs(argv[1])
    print ','.join([str(k) for k in inputs])
    print ','.join([str(k) for k in list(outputs)])
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
