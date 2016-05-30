import os
import sys
import imp
import inspect
import aimsun_executor

import pdb
def main(argv):
    filepath = argv[1]
    mod_name, file_ext = os.path.splitext(os.path.split(filepath)[-1])
    py_mod = imp.load_source(mod_name, filepath)
    pdb.set_trace()
    class_obj = aimsun_executor.get_main_class(argv[1])
    if class_obj is None:
        return 1
    inputs = inspect.getargspec(class_obj.main)[0]
    outputs = aimsun_executor.get_outputs(argv[1])
    print inputs
    print outputs
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
