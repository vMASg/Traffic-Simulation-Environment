import sys
from subprocess import Popen, PIPE

def enum(*sequential, **named):
    enums = dict(zip(sequential, range(len(sequential))), **named)
    return type('Enum', (object,), enums)

def switch_state(goal_state):
    def decorator(func):
        def return_func(*args):
            self = args[0]
            current_state = self.state
            if current_state == goal_state:
                return func(*args)
            if current_state == AimsunProc.UNSTARTED and goal_state == AimsunProc.READY:
                self._start_process()
            else:
                print "Falta implementar"
            return func(*args)
        return return_func
    return decorator

AimsunProcState = enum('UNSTARTED', 'READY', 'RUNNING')

class AimsunProc(AimsunProcState):
    """docstring for AimsunProc"""
    def __init__(self, aconsole_path, script_path):
        super(AimsunProc, self).__init__()
        self.state = AimsunProcState.UNSTARTED
        self.aconsole_path = aconsole_path
        self.script_path = script_path
        self._cmd = None
        self.current_model = None

    def __del__(self):
        print "Closing Aimsun"
        self._send_msg("EXIT")
        self._cmd.stdin.close()
        self._cmd.wait()

    def _send_msg(self, msg):
        self._cmd.stdin.write("%d\n" % len(msg))
        self._cmd.stdin.write(msg)
        self._cmd.stdin.flush()

    def _receive_msg(self):
        msg_len = int(self._cmd.stdout.readline()[:-2])
        return self._cmd.stdout.read(msg_len)

    @switch_state(AimsunProcState.UNSTARTED)
    def _start_process(self):
        print self.script_path
        self._cmd = Popen(
            [self.aconsole_path, '-script', self.script_path],
            stdin=PIPE,
            stdout=PIPE
        )
        print self._receive_msg()
        self.state = AimsunProcState.READY

    @switch_state(AimsunProcState.READY)
    def run_script(self, script_content, model_id):
        print "Current state: {}".format(self.state)
        if self.current_model != model_id:
            if self.current_model is not None:
                self._send_msg('CLOSE MODEL')
                assert self._receive_msg() == 'OK'

            self._send_msg('OPEN MODEL {}'.format(model_id))
            assert self._receive_msg() == 'OK'
            self.current_model = model_id
        self._send_msg('EXECUTE\n{}'.format(script_content))
        return self._receive_msg()

    @switch_state(AimsunProcState.UNSTARTED)
    def run_pipeline(self, pipeline_path):
        self._cmd = Popen(
            [self.aconsole_path, '-script', 'external\\aimsun_executor.py', pipeline_path]
        )
        return "OK"


class AimsunService(object):
    """docstring for AimsunService"""
    def __init__(self, aconsole_path, script_path):
        super(AimsunService, self).__init__()
        self._aimsun_proc1 = AimsunProc(aconsole_path, script_path)
        self._aimsun_proc2 = AimsunProc(aconsole_path, script_path)

    def run_script(self, script_content, model_id):
        return self._aimsun_proc1.run_script(script_content, model_id)

    def run_pipeline(self, pipeline_path):
        return self._aimsun_proc1.run_pipeline(pipeline_path)
