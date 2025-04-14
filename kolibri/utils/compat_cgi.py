"""
A minimal port of the removed cgi module for use in Python 3.13.
Only imports the specific parts of the module that are used by Django.
Informed by the PR that removed its use in Django:
https://github.com/django/django/pull/15679
"""


def _parseparam(s):
    while s[:1] == ";":
        s = s[1:]
        end = s.find(";")
        while end > 0 and (s.count('"', 0, end) - s.count('\\"', 0, end)) % 2:
            end = s.find(";", end + 1)
        if end < 0:
            end = len(s)
        f = s[:end]
        yield f.strip()
        s = s[end:]


def parse_header(line):
    """
    Parse a Content-type like header.
    Return the main content-type and a dictionary of options.
    """
    parts = _parseparam(";" + line)
    key = parts.__next__()
    pdict = {}
    for p in parts:
        i = p.find("=")
        if i >= 0:
            name = p[:i].strip().lower()
            value = p[i + 1 :].strip()
            if len(value) >= 2 and value[0] == value[-1] == '"':
                value = value[1:-1]
                value = value.replace("\\\\", "\\").replace('\\"', '"')
            pdict[name] = value
    return key, pdict


boundary_re = None


def valid_boundary(boundary):
    # Do this import here to avoid importing dependencies in the env module.
    from django.utils.regex_helper import _lazy_re_compile

    global boundary_re

    if boundary_re is None:
        boundary_re = _lazy_re_compile(rb"[ -~]{0,200}[!-~]")
    return boundary_re.fullmatch(boundary) is not None
