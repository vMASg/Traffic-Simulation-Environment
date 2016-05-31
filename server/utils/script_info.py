import subprocess

def get_inputs_outputs(script_path):
    cmd = subprocess.Popen(['python', 'server\\external\\get_input_output.py', script_path], stdout=subprocess.PIPE)
    ret = cmd.wait()
    if ret != 0:
        return None, None
    retval = cmd.communicate()[0].split('\n')
    inputs  = [a.strip() for a in retval[0].split(',')]
    outputs = [a.strip() for a in retval[1].split(',')]
    return inputs, outputs
