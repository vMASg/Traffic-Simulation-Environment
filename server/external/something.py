from aimsun_executor import return_name, PythonScript

class BikeLanes(PythonScript):
    """docstring for BikeLanes"""

    @return_name('a', 'b', 'c')
    def main(self, arg1, arg2):
        """docstring for method main"""
        a, b, c = arg1, arg2, arg1 + arg2
        return a, b, c


if __name__ == '__main__':
    BikeLanes().main(1, 2)
