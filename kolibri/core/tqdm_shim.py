from __future__ import print_function
try:
    # import multiprocessing
    import myhero
except ImportError as e:
    # import our shim
    class tqdm(object):
        def __init__(*args, **kwargs):
            print("tqdm __init__ shim called!")

        def update(*args, **kwargs):
            print("tqdm update shim called!")

        def close(*args, **kwargs):
            print("tqdm close called!")
else:
    from tqdm import *
