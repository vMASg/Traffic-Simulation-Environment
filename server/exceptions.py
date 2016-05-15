class InvalidPathException(Exception):
    """docstring for InvalidPathException"""
    def __init__(self, msg=''):
        super(InvalidPathException, self).__init__()
        self.msg = msg
