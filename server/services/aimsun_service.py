import threading
import json
from time import time
from Queue import Queue, Empty as QueueEmpty
from subprocess import Popen, PIPE, STDOUT

class PipelineThread(threading.Thread):
    def __init__(self, pipeline, aconsole_path, subscription_channel, output, event):
        super(PipelineThread, self).__init__(name='PipelineThread')
        self.pipeline, self.pipeline_inputs, self.pipeline_outputs = pipeline
        self.aconsole_path = aconsole_path
        self.subscription_channel = subscription_channel
        self.output = output
        self.event = event

    def run(self):
        inout = [self.pipeline_inputs or '-', self.pipeline_outputs or '-']
        cmd = Popen(
            # ['python', 'server\\external\\aimsun_executor.py', self.pipeline] + inout,
            [self.aconsole_path, '-script', 'server\\external\\aimsun_executor.py', self.pipeline] + inout,
            # stdin=PIPE,
            stdout=PIPE,
            stderr=STDOUT
            # universal_newlines=True
        )
        blocker = threading.Event()
        if cmd.stdout.readline().strip() == 'READY':
            print 'READY'
            self.output.put(True)
            ret_code = cmd.poll()
            self.subscription_channel.start()
            # Adding inputs
            self.subscription_channel.meta['startTime'] = int(time())
            if self.pipeline_inputs is not None:
                with open(self.pipeline_inputs, 'r') as f:
                    input_json = json.loads(f.read())
                self.subscription_channel.meta['inputs'] = input_json
            self.subscription_channel.send_meta()
            # End inputs
            while ret_code is None:
                output = '[WKUP]'
                while output.endswith('[WKUP]'):
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

            # self.output.put(ret_code)
            # Print everything left in buffer
            output = cmd.stdout.read().strip()
            print "finished {}: {}".format(ret_code, output)
            cmd.stdout.close()
            # cmd.stderr.close()
            if len(output) > 0:
                self.subscription_channel.broadcast(output)
            out = None
            if self.pipeline_outputs is not None:
                with open(self.pipeline_outputs, 'r') as out_file:
                    out = json.loads(out_file.read())
                self.subscription_channel.meta['outputs'] = out
                self.subscription_channel.send_meta()
            self.subscription_channel.end()
            self.event.set()
        else:
            print 'ERROR'
            self.output.put(False)


class ThreadSpawner(threading.Thread):
    def __init__(self, execution_queue, aconsole_path, pipeline_channel):
        super(ThreadSpawner, self).__init__(name='ThreadSpawner')
        self.execution_queue = execution_queue
        self.aconsole_path = aconsole_path
        self.pipeline_channel = pipeline_channel
        self.stoprequest = threading.Event()
        self.threads = []
        self._next_pipeline = None
        self._event = threading.Event()

    def run(self):
        while not self.stoprequest.is_set():
            while self._next_pipeline is None and not self.stoprequest.is_set():
                self._spwn_pipelines()
                to_remove = []
                for thr in self.threads:
                    if not thr.is_alive():
                        self.pipeline_channel.broadcast({'channel': thr.subscription_channel.channel_name, 'operation': 'finished'})
                        thr.join()
                        to_remove.append(thr)

                for thr in to_remove:
                    self.threads.remove(thr)

            self._spwn_pipelines()
            # TODO add timeout (and cancel threads) in case of final join
            self._event.wait(10.0)
            self._event.clear()
            to_remove = []
            for thr in self.threads:
                if not thr.is_alive():
                    thr.join()
                    to_remove.append(thr)

            for thr in to_remove:
                self.threads.remove(thr)

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
                output = Queue()
                new_thread = PipelineThread(self._next_pipeline[0], self.aconsole_path, self._next_pipeline[1], output, self._event)
                new_thread.start()
                # Check if spwn has been successful
                try:
                    spwn_success = output.get(True, 5.0)
                except QueueEmpty:
                    spwn_success = False
                else:
                    if spwn_success:
                        self.pipeline_channel.broadcast({'channel': self._next_pipeline[1].channel_name, 'operation': 'dequeued'})
                        self._next_pipeline = None
                        self.threads.append(new_thread)

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
        self._execution_thread = ThreadSpawner(self._execution_queue, aconsole_path, self.pipeline_channel)
        self._execution_thread.start()

    # def run_script(self, script_content, model_id):
    #     # return self._aimsun_proc1.run_script(script_content, model_id)
    #     raise DeprecationWarning()

    def run_pipeline(self, pipeline_path, subscription_channel):
        self._execution_queue.put((pipeline_path, subscription_channel))
        self.pipeline_channel.broadcast({'channel': subscription_channel.channel_name, 'operation': 'enqueued'})
        # return self._aimsun_proc1.run_pipeline(pipeline_path)
