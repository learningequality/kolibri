import os
import re

LOAD_TESTING_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _inline_dependencies(script):
    with open(os.path.join(LOAD_TESTING_DIR, script)) as f:
        source = f.read()
    block = re.search(r"^# /// script$(.*?)^# ///$", source, re.M | re.S).group(1)
    dependencies = re.search(r"dependencies = \[(.*?)\]", block, re.S).group(1)
    return set(re.findall(r'"([^"]+)"', dependencies))


def test_bench_dependencies_cover_loadtest_except_playwright():
    missing = _inline_dependencies("loadtest.py") - _inline_dependencies("bench.py")
    assert missing == {"playwright"}
