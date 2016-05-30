import inspect
from collections import namedtuple

def get_main_class(filepath):
    info = classregistry.packages[filepath]
    return info.class_obj if info is not None else None

def get_outputs(filepath):
    info = classregistry.packages[filepath]
    return info.outputs if info is not None else None

def return_name(*args):
    def decorator(f):
        f.return_name = args
        return f
    return decorator

class ScriptRegistry(object):
    ClassInfo = namedtuple('ClassInfo', ['filepath', 'module', 'class_obj', 'outputs'])

    """docstring for ScriptRegistry"""
    def __init__(self):
        super(ScriptRegistry, self).__init__()
        self.packages = {}
    
    def register_class(self, cls, outputs):
        module, source_file = inspect.getmodule(cls), inspect.getsourcefile(cls)
        self.packages[source_file] = ScriptRegistry.ClassInfo(source_file, module, cls, outputs)

classregistry = ScriptRegistry()

class PythonScriptType(type):
    """docstring for PythonScriptType"""
    def __new__(cls, name, bases, attrs):
        if hasattr(attrs['main'], 'return_name'):
            classregistry.register_class(cls, attrs['main'].return_name)
        else:
            classregistry.register_class(cls, ['out'])
        return super(PythonScriptType, cls).__new__(cls, name, bases, attrs)

    def __init__(self, name, bases, attrs):
        super(PythonScriptType, self).__init__(name, bases, attrs)
        

class PythonScript(object):
    """docstring for PythonScript"""
    __metaclass__ = PythonScriptType

    def main(self):
        # raise UnimplementedMethod
        pass

