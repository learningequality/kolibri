import threading
import time

from mock import patch

from kolibri.core.tasks.utils import InfiniteLoopThread


class TestBaseCloseableThread(object):
    def test_handles_interpreter_shutting_down(self):
        """
        For python interpreters older than 3.4, we know that it sets
        all objects leading with an underscore, to None. threading.Event.wait
        depends on _time(), which has an underscore, leading us to raise an
        exception when wait() is called during shutdown. See

         https://github.com/learningequality/kolibri/issues/1786#issuecomment-313754844


        for a fuller explanation.

        The test here is to see if InfiniteLoopThread
        can handle threading._time being None.

        Make sure to use the actual threading module.
        """

        with patch.object(threading, "_time"):
            t = InfiniteLoopThread(lambda: id(1), thread_name="test")
            t.start()
            time.sleep(1)
        t.shutdown()
