class InvalidPathException(Exception):
    """docstring for InvalidPathException"""
    def __init__(self, msg=''):
        super(InvalidPathException, self).__init__()
        self.msg = msg

class LockException(Exception):
    """docstring for LockException"""
    def __init__(self, msg=''):
        super(LockException, self).__init__()
        self.msg = msg
