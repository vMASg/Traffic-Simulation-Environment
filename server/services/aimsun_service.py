import threading
from Queue import Queue, Empty as QueueEmpty
from subprocess import Popen, PIPE

class PipelineThread(threading.Thread):
    def __init__(self, pipeline, aconsole_path, subscription_channel, output, event):
        super(PipelineThread, self).__init__(name='PipelineThread')
        self.pipeline = pipeline
        self.aconsole_path = aconsole_path
        self.subscription_channel = subscription_channel
        self.output = output
        self.event = event

    def run(self):
        cmd = Popen(
            [self.aconsole_path, '-script', 'server\\external\\aimsun_executor.py', self.pipeline],
            # stdin=PIPE,
            stdout=PIPE,
            stderr=PIPE
            # universal_newlines=True
        )
        if cmd.stderr.readline().strip() == 'READY':
            print 'READY'
            self.output.put(True)
            ret_code = cmd.poll()
            self.subscription_channel.start()
            while ret_code is None:
                output = cmd.stdout.readline().strip()
                # write to subscription_channel
                if len(output) > 0:
                    self.subscription_channel.broadcast(output)
                ret_code = cmd.poll()

            # self.output.put(ret_code)
            # Print everything left in buffer
            output = cmd.stdout.read()
            cmd.stdout.close()
            cmd.stderr.close()
            if len(output) > 0:
                self.subscription_channel.broadcast(output)
            self.subscription_channel.end()
            self.event.set()
        else:
            print 'ERROR'
            self.output.put(False)


class ThreadSpawner(threading.Thread):
    def __init__(self, execution_queue, aconsole_path):
        super(ThreadSpawner, self).__init__(name='ThreadSpawner')
        self.execution_queue = execution_queue
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
            self._event.wait(10.0)
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
        self._execution_thread = ThreadSpawner(self._execution_queue, aconsole_path)
        self._execution_thread.start()

    def run_script(self, script_content, model_id):
        # return self._aimsun_proc1.run_script(script_content, model_id)
        raise DeprecationWarning()

    def run_pipeline(self, pipeline_path, subscription_channel):
        self._execution_queue.put((pipeline_path, subscription_channel))
        # return self._aimsun_proc1.run_pipeline(pipeline_path)
