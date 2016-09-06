from aimsun_scriptreg import return_name, AconsoleScript
from PyANGKernel import GKScript

class RunScript(AconsoleScript):
    """docstring for RunScript"""

    @return_name()
    def main(self, model, script):
        gscript = GKScript()
        gscript.setCode(script)
        gscript.execute(model)
