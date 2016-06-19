import sys
import threading
from Queue import Queue, Empty as QueueEmpty
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

class PipelineThread(threading.Thread):
    def __init__(self, pipeline, aconsole_path, subscription, output, event):
        super(PipelineThread, self).__init__()
        self.pipeline = pipeline
        self.aconsole_path = aconsole_path
        self.subscription = subscription
        self.output = output
        self.event = event
        self._cmd = None

    def _send_msg(self, msg):
        self._cmd.stdin.write("%d\n" % len(msg))
        self._cmd.stdin.write(msg)
        self._cmd.stdin.flush()

    def _receive_msg(self):
        msg_len = int(self._cmd.stdout.readline()[:-2])
        return self._cmd.stdout.read(msg_len)

    def run(self):
        self._cmd = Popen(
            [self.aconsole_path, '-script', 'external\\aimsun_executor.py', self.pipeline]
        )
        if self._receive_msg() == 'READY':
            self.output.put(True)
            self._cmd.wait()
            self.event.set()
        else:
            self.output.put(False)


class ThreadSpawner(threading.Thread):
    def __init__(self, execution_queue, subscriptor_sender, aconsole_path):
        super(ThreadSpawner, self).__init__()
        self.execution_queue = execution_queue
        self.subscriptor_sender = subscriptor_sender
        self.aconsole_path = aconsole_path
        self.stoprequest = threading.Event()
        self.threads = []
        self._next_pipeline = None
        self._event = threading.Event()

    def run(self):
        while not self.stoprequest.is_set():
            while self._next_pipeline is None and not self.stoprequest.is_set():
                self._spwn_pipelines()
                for thr in self.threads:
                    if not thr.is_alive():
                        del thr

            self._spwn_pipelines()
            # TODO add timeout (and cancel threads) in case of final join
            self._event.wait()
            self._event.clear()
            for thr in self.threads:
                if not thr.is_alive():
                    del thr

        # TODO kill all threads (cancel executions)
        for thr in self.threads:
            if thr.is_alive():
                thr.join()

    def _spwn_pipelines(self):
        spwn_success = True
        while spwn_success:
            try:
                self._next_pipeline = self.execution_queue.get(True, 0.5) if self._next_pipeline is None else self._next_pipeline
            except QueueEmpty:
                spwn_success = False
                self._next_pipeline = None
            else:
                output = Queue
                new_thread = PipelineThread(self._next_pipeline, self.aconsole_path, self.subscriptor_sender, output, self._event)
                new_thread.start()
                # Check if spwn has been successful
                try:
                    spwn_success = output.get(True, 5.0)
                except QueueEmpty:
                    spwn_success = False
                else:
                    if spwn_success:
                        self._next_pipeline = None
                        self.threads.append(new_thread)

    def join(self, timeout=None):
        self.stoprequest.set()
        super(ThreadSpawner, self).join(timeout)


class AimsunService(object):
    """docstring for AimsunService"""
    def __init__(self, aconsole_path):
        super(AimsunService, self).__init__()
        self._aconsole_path = aconsole_path
        self._execution_queue = Queue()
        self._execution_thread = ThreadSpawner(self._execution_queue, subscriptor_sender, aconsole_path)
        self._execution_thread.start()

    def run_script(self, script_content, model_id):
        return self._aimsun_proc1.run_script(script_content, model_id)

    def run_pipeline(self, pipeline_path):
        self._execution_queue.append(pipeline_path)
        # return self._aimsun_proc1.run_pipeline(pipeline_path)
