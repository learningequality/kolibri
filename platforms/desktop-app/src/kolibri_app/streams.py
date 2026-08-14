import io
import threading


class _WriterState(threading.local):
    """Per-thread buffer and reentrancy flag; the class attributes are the defaults."""

    msg = ""
    writing = False


class LoggerWriter(io.IOBase):
    """
    File-like object that forwards each complete line it receives to a logging
    callable.

    Partial lines are buffered per thread, so two threads mid-line cannot
    interleave into one message. Writes issued while this thread is already
    inside the callable are dropped: logging reports handler failures on
    sys.stderr, which the app points back here, so re-logging one failure
    produces more of them without bound (learningequality/kolibri#15150).
    """

    def __init__(self, writer):
        self._writer = writer
        self._state = _WriterState()

    def readable(self):
        return False

    def writable(self):
        return True

    def write(self, message):
        if self._state.writing:
            return
        self._state.writing = True
        try:
            msg = self._state.msg + message
            while "\n" in msg:
                pos = msg.find("\n")
                self._writer(msg[:pos])
                msg = msg[pos + 1 :]
            self._state.msg = msg
        finally:
            self._state.writing = False

    def flush(self):
        # Completing the buffered line through write() reuses its guard.
        if self._state.msg:
            self.write("\n")
