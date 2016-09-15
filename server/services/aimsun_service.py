import threading
import json
import os
import psutil
from time import time
from Queue import Queue, Empty as QueueEmpty
from subprocess import Popen, PIPE, STDOUT, CREATE_NEW_PROCESS_GROUP
from server.constants import PYTHON_DIR

class PipelineThread(threading.Thread):
    def __init__(self, pipeline, aconsole_path, subscription_channel, only_python, output, event):
        super(PipelineThread, self).__init__(name='PipelineThread')
        self.pipeline, self.pipeline_inputs, self.pipeline_outputs = pipeline
        self.aconsole_path = aconsole_path
        self.subscription_channel = subscription_channel
        self.only_python = only_python
        self.output = output
        self.event = event
        self._event_abort = threading.Event()

        self.subscription_channel.on('abort', self.abort)

    def abort(self):
        self._event_abort.set()

    def run(self):
        inout = [self.pipeline_inputs or '-', self.pipeline_outputs or '-']
        if self.only_python:
            cmd = Popen(
                ['python', 'server\\external\\aimsun_executor.py', self.pipeline] + inout,
                # [self.aconsole_path, '-script', 'server\\external\\aimsun_executor.py', self.pipeline] + inout,
                # stdin=PIPE,
                stdout=PIPE,
                stderr=STDOUT,
                universal_newlines=True
            )
        else:
            environ = os.environ.copy()
            environ['PYTHONDIR'] = PYTHON_DIR
            cmd = Popen(
                # ['python', 'server\\external\\aimsun_executor.py', self.pipeline] + inout,
                [self.aconsole_path, '-script', 'server\\external\\aimsun_executor.py', self.pipeline] + inout,
                # stdin=PIPE,
                stdout=PIPE,
                stderr=STDOUT,
                universal_newlines=True,
                env=environ
            )
        blocker = threading.Event()
        if cmd.stdout.readline().strip() == 'READY':
            print 'READY'
            self.output.put(True)
            ret_code = cmd.poll()
            self.subscription_channel.start()
            # Adding inputs
            self.subscription_channel.meta['startTime'] = time()
            if self.pipeline_inputs is not None:
                with open(self.pipeline_inputs, 'r') as f:
                    input_json = json.loads(f.read())
                self.subscription_channel.meta['inputs'] = input_json
            self.subscription_channel.send_meta()
            # End inputs
            while ret_code is None and not self._event_abort.is_set():
                output = '[WKUP]'
                while output.endswith('[WKUP]') and not self._event_abort.is_set():
                    output = output[:-6]
                    output += cmd.stdout.readline().strip()
                    blocker.wait(0.2)
                    # print 'stuck'

                print "out: {}".format(output)
                # write to subscription_channel
                if len(output) > 0:
                    print 'yup'
                    self.subscription_channel.broadcast(output)
                ret_code = cmd.poll()

            aborted = False
            if self._event_abort.is_set():
                self.kill_proc_tree(cmd.pid, including_parent=False)
                cmd.kill()
                self.subscription_channel.meta['aborted'] = True
                aborted = True

            # self.output.put(ret_code)
            # Print everything left in buffer
            output = cmd.stdout.read().strip()
            if output.endswith('[WKUP]'):
                output = output[:-6]
            print "{} {}: {}".format('finished' if not aborted else 'aborted', ret_code, output)
            cmd.stdout.close()
            # cmd.stderr.close()
            if len(output) > 0:
                self.subscription_channel.broadcast(output)
            out = None
            if self.pipeline_outputs is not None and os.path.exists(self.pipeline_outputs):
                with open(self.pipeline_outputs, 'r') as out_file:
                    out = json.loads(out_file.read())
                self.subscription_channel.meta['outputs'] = out or {}
            self.subscription_channel.meta['finishTime'] = time()
            self.subscription_channel.send_meta()
            self.subscription_channel.end()
            self.event.set()
        else:
            print 'ERROR'
            self.output.put(False)

    def kill_proc_tree(self, pid, including_parent=True):
        parent = psutil.Process(pid)
        children = parent.children(recursive=True)
        for child in children:
            child.kill()
        psutil.wait_procs(children, timeout=5)
        if including_parent:
            parent.kill()
            parent.wait(5)


class ThreadSpawner(threading.Thread):
    def __init__(self, execution_queue, python_queue, aconsole_path, pipeline_channel):
        super(ThreadSpawner, self).__init__(name='ThreadSpawner')
        self.execution_queue = execution_queue
        # self.simulation_queue = simulation_queue
        self.python_queue = python_queue
        self.aconsole_path = aconsole_path
        self.pipeline_channel = pipeline_channel
        self.stoprequest = threading.Event()
        self.threads = []
        self._next_pipeline = None
        self._event = threading.Event()
        self._simulation_thread = None
        self._simulation_queue = []

    def run(self):
        while not self.stoprequest.is_set():
            while self._next_pipeline is None and not self.stoprequest.is_set():
                self._spwn_pipelines()
                to_remove = []
                for thr in self.threads:
                    if not thr.is_alive():
                        self.pipeline_channel.broadcast({'channel': thr.subscription_channel.channel_name, 'operation': 'finished'})
                        self._clean_finished(self.pipeline_channel)
                        thr.join()
                        to_remove.append(thr)

                for thr in to_remove:
                    if thr is self._simulation_thread:
                        self._simulation_thread = None
                    self.threads.remove(thr)

            self._spwn_pipelines()
            # TODO add timeout (and cancel threads) in case of final join
            self._event.wait(10.0)
            self._event.clear()
            to_remove = []
            for thr in self.threads:
                if not thr.is_alive():
                    self.pipeline_channel.broadcast({'channel': thr.subscription_channel.channel_name, 'operation': 'finished'})
                    self._clean_finished(self.pipeline_channel)
                    thr.join()
                    to_remove.append(thr)

            for thr in to_remove:
                if thr is self._simulation_thread:
                    self._simulation_thread = None
                self.threads.remove(thr)

        # TODO kill all threads (cancel executions)
        for thr in self.threads:
            if thr.is_alive():
                thr.join()

    def _clean_finished(self, pip):
        finished_tasks = [a['channel'] for a in pip.previous_broadcasts if 'operation' in a and a['operation'] == 'finished']
        pip.previous_broadcasts = [a for a in pip.previous_broadcasts if 'operation' not in a or a['channel'] not in finished_tasks]

    def _spwn_pipelines(self):
        spwn_success = True
        while spwn_success:
            try:
                self._next_pipeline = self._get_next_pipeline() if self._next_pipeline is None else self._next_pipeline
            except QueueEmpty:
                spwn_success = False
                self._next_pipeline = None
            else:
                output = Queue()
                new_thread = PipelineThread(self._next_pipeline[0], self.aconsole_path, self._next_pipeline[1], self._next_pipeline[3], output, self._event)
                new_thread.start()
                # Check if spwn has been successful
                try:
                    spwn_success = output.get(True, 5.0)
                except QueueEmpty:
                    spwn_success = False
                else:
                    if spwn_success:
                        self.pipeline_channel.broadcast({'channel': self._next_pipeline[1].channel_name, 'operation': 'dequeued'})
                        if self._next_pipeline[2]:
                            self._simulation_thread = new_thread
                        self._next_pipeline = None
                        self.threads.append(new_thread)

    def _get_next_pipeline(self):
        if self._simulation_thread is None and len(self._simulation_queue) > 0:
            return self._simulation_queue.pop(0)
        else:
            try:
                next_pipe = self.python_queue.get(True, 0.5)
            except QueueEmpty:
                next_pipe = self.execution_queue.get(True, 0.5)
                if next_pipe[2] and self._simulation_thread is not None:
                    self._simulation_queue.append(next_pipe)
                    return self._get_next_pipeline()
            return next_pipe

    def join(self, timeout=None):
        self.stoprequest.set()
        super(ThreadSpawner, self).join(timeout)


class AimsunService(object):
    """docstring for AimsunService"""
    def __init__(self, aconsole_path, subscription_service):
        super(AimsunService, self).__init__()
        self._aconsole_path = aconsole_path
        self._subscription_service = subscription_service
        self.pipeline_channel = subscription_service.create_subscription_channel('executions')
        self.pipeline_channel.start()
        self._execution_queue = Queue()
        # self._simulation_queue = Queue()
        self._python_queue = Queue()
        self._execution_thread = ThreadSpawner(self._execution_queue, self._python_queue, aconsole_path, self.pipeline_channel)
        self._execution_thread.start()

    # def run_script(self, script_content, model_id):
    #     # return self._aimsun_proc1.run_script(script_content, model_id)
    #     raise DeprecationWarning()

    def run_pipeline(self, pipeline_path, subscription_channel, is_executor=False, only_python=False):
        if only_python:
            self._python_queue.put((pipeline_path, subscription_channel, False, True))
        else:
            self._execution_queue.put((pipeline_path, subscription_channel, is_executor, False))
        self.pipeline_channel.broadcast({'channel': subscription_channel.channel_name, 'operation': 'enqueued'})
        # return self._aimsun_proc1.run_pipeline(pipeline_path)
