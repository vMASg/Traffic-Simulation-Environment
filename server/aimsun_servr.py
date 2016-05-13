import os
import sys
import traceback
import time

from PyANGBasic import *
from PyANGKernel import *
from PyANGConsole import *

def write_flush(msg, stream=sys.stdout):
    stream.write("%d\n" % len(msg))
    stream.write(msg)
    stream.flush()

class InstructionException(Exception):
    """docstring for InstructionException"""
    def __init__(self, instruction, msg):
        super(InstructionException, self).__init__()
        self.instruction = instruction
        self.msg = msg

class RedirectStdStreams(object):
    def __init__(self, stdout=None, stderr=None):
        self._stdout = stdout or sys.stdout
        self._stderr = stderr or sys.stderr

    def __enter__(self):
        self.old_stdout, self.old_stderr = sys.stdout, sys.stderr
        # self.old_stdout.flush(); self.old_stderr.flush()
        sys.stdout, sys.stderr = self._stdout, self._stderr

    def __exit__(self, exc_type, exc_value, traceback):
        self._stdout.flush(); self._stderr.flush()
        sys.stdout = self.old_stdout
        sys.stderr = self.old_stderr

class Aimsun(object):
    """docstring for Aimsun"""
    def __init__(self):
        super(Aimsun, self).__init__()
        self.console = ANGConsole()
        self.model = None

    def process_instruction(self, instr):
        if instr.startswith("OPEN MODEL"):
            if not self.console.open(instr[(len("OPEN MODEL") + 1):]):
                raise InstructionException("OPEN", "OPEN, file not found: %s\n" % instr[5:])
            self.model = self.console.getModel()
            # GKSystem.getSystem().setActiveModel(self.model)
            # GKSystem.getSystem().activeModel = self.model
            write_flush("OK")

        elif instr == "CLOSE MODEL":
            self.console.close()
            self.model = None
            write_flush("OK")

        elif instr.startswith("GET EXPERIMENTS FROM"):
            if self.model is not None:
                scenario = self.model.getCatalog().find(int(instr[(len("GET EXPERIMENTS FROM") + 1):]))
                if not scenario.isA('GKScenario'):
                    raise InstructionException("GET EXPERIMENTS FROM", "GET EXPERIMENTS FROM: ID not a Scenario")
                folder = scenario.getExperiments()
                names = [('"' + str(experiment.getName()) + '"') for obj_id, experiment in folder.getContents().iteritems()]
                write_flush('[' + ','.join(names) + ']')

        elif instr.startswith('EXECUTE'):
            d = instr.split('\n', 1)
            sys.stderr.write(str(d))
            sys.stderr.flush()
            script = GKScript()
            script.setCode(d[1])
            script_out = ""
            try:
                read_end, write_end = os.pipe()
                read_stream = os.fdopen(read_end, 'r')
                write_stream = os.fdopen(write_end, 'w')
                with RedirectStdStreams(write_stream, write_stream):
                    script.execute(self.model)
                write_stream.close()
                script_out = read_stream.read()
                read_stream.close()
            except:
                write_flush('Error')
                # traceback.print_exc()
            else:
                write_flush('{"status": "OK", "output": "%s"}' % script_out[:-1])
                # write_flush(script_out)

        elif instr.startswith('SAVE MODEL AS'):
            self.console.save(instr[(len("SAVE MODEL AS") + 1):])
            write_flush('OK')

        elif instruction == 'SAVE MODEL':
            self.console.save(self.model.getDocumentFileName())
            write_flush('OK')

        elif instruction == 'CLOSE MODEL':
            self.console.close()
            write_flush('OK')

def next_instruction():
    msg_len = int(sys.stdin.readline()[:-1])
    return sys.stdin.read(msg_len)

def main(argv):
    write_flush("READY")
    aimsun = Aimsun()
    instr = next_instruction()
    while instr != "EXIT":
        try:
            aimsun.process_instruction(instr)
        except InstructionException as ie:
            write_flush(ie.msg, sys.stderr)
        except Exception, e:
            traceback.print_exc()
            raise e
        instr = next_instruction()
        time.sleep(0.5)
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
