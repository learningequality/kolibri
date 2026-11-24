"""Tests for LoggerWriter in streams.py."""

import threading
import unittest

from kolibri_app.streams import LoggerWriter


class TestLoggerWriter(unittest.TestCase):
    def test_forwards_complete_lines(self):
        written = []
        stream = LoggerWriter(written.append)

        stream.write("one\ntwo\n")

        self.assertEqual(written, ["one", "two"])

    def test_a_line_flushed_after_every_write_is_one_record(self):
        # colorama, which Django initialises on import, wraps sys.stderr and
        # flushes after every write.
        written = []
        stream = LoggerWriter(written.append)

        for part in ("Exception in thread ", "ZeroConfPlugin", ":\n"):
            stream.write(part)
            stream.flush()

        self.assertEqual(written, ["Exception in thread ZeroConfPlugin:"])

    def test_flush_partial_line_forwards_a_trailing_partial_line(self):
        written = []
        stream = LoggerWriter(written.append)

        stream.write("partial")
        stream.flush_partial_line()

        self.assertEqual(written, ["partial"])

    def test_stays_writable_after_flushing_the_partial_line(self):
        written = []
        stream = LoggerWriter(written.append)

        stream.flush_partial_line()
        stream.write("later\n")
        stream.flush()

        self.assertEqual(written, ["later"])

    def test_partial_lines_from_two_threads_do_not_interleave(self):
        # A shared buffer would splice the other thread's line into this one.
        written = []
        stream = LoggerWriter(written.append)

        stream.write("main")
        thread = threading.Thread(target=stream.write, args=("other\n",))
        thread.start()
        thread.join()
        stream.write("\n")

        self.assertEqual(written, ["other", "main"])

    def test_drops_writes_issued_from_within_the_writer(self):
        # logging reports a handler failure on sys.stderr, which the app points
        # back at logging; re-logging that report recurses without bound.
        written = []

        def writer(line):
            written.append(line)
            # Bounded so an unguarded writer fails the assertion below rather
            # than recursing until the test runner gives up.
            if len(written) < 100:
                stream.write("--- Logging error ---\n")

        stream = LoggerWriter(writer)
        stream.write("original\n")

        self.assertEqual(written, ["original"])

    def test_suppression_does_not_leak_to_other_threads(self):
        # Only the thread that is mid-write is suppressed; a plain instance flag
        # would silence every other thread logging at the same moment.
        written = []
        spawned = threading.Event()

        def writer(line):
            written.append(line)
            if spawned.is_set():
                return
            spawned.set()
            thread = threading.Thread(target=stream.write, args=("inner\n",))
            thread.start()
            thread.join()

        stream = LoggerWriter(writer)
        stream.write("outer\n")

        self.assertIn("inner", written)
