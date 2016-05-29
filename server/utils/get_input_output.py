import sys
import importlib

def main(argv):
    module = importlib.import_module(argv[1])
    return 0

if __name__ == '__main__':
    main(sys.argv)
