import inspect
from collections import namedtuple

def get_main_class(filepath):
    info = classregistry.packages[filepath]
    return info.class_obj if info is not None else None

def get_outputs(filepath):
    info = classregistry.packages[filepath]
    return info.outputs if info is not None else None

def get_inputs(filepath):
    info = classregistry.packages[filepath]
    return info.inputs if info is not None else None

def is_python_script(filepath):
    info = classregistry.packages[filepath]
    return PythonScript in info.bases

def is_aconsole_script(filepath):
    info = classregistry.packages[filepath]
    return AconsoleScript in info.bases

def requires_model(filepath):
    info = classregistry.packages[filepath]
    return info.require_context

def return_name(*args):
    def decorator(f):
        f.return_name = args
        return f
    return decorator

def require_model(f):
    f.require_model = True
    return f

class ScriptRegistry(object):
    ClassInfo = namedtuple('ClassInfo', ['filepath', 'module', 'class_obj', 'bases', 'inputs', 'outputs', 'require_context'])

    """docstring for ScriptRegistry"""
    def __init__(self):
        super(ScriptRegistry, self).__init__()
        self.packages = {}
    
    def register_class(self, cls, bases, inputs, outputs, require_context=False):
        module, source_file = inspect.getmodule(cls), inspect.getsourcefile(cls)
        self.packages[source_file] = ScriptRegistry.ClassInfo(source_file, module, cls, bases, inputs, outputs, require_context)

classregistry = ScriptRegistry()

class ScriptType(type):
    """docstring for ScriptType"""
    def __new__(cls, name, bases, attrs):
        cls_obj = super(ScriptType, cls).__new__(cls, name, bases, attrs)
        inputs = inspect.getargspec(cls_obj.main)[0][1:]
        if 'main' in attrs and hasattr(attrs['main'], 'return_name'):
            if hasattr(attrs['main'], 'require_model'):
                classregistry.register_class(cls_obj, bases, tuple(inputs), attrs['main'].return_name, attrs['main'].require_model)
            else:
                classregistry.register_class(cls_obj, bases, tuple(inputs), attrs['main'].return_name)
        else:
            classregistry.register_class(cls_obj, bases, tuple(inputs), ['out'])
        return cls_obj

    def __init__(self, name, bases, attrs):
        super(ScriptType, self).__init__(name, bases, attrs)
        

class PythonScript(object):
    """docstring for PythonScript"""
    __metaclass__ = ScriptType

    def main(self):
        raise NotImplementedError

class AconsoleScript(object):
    """docstring for AconsoleScript"""
    __metaclass__ = ScriptType

    def main(self):
        raise NotImplementedError
