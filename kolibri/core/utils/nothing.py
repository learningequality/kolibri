class Nothing:
    """Comparable falsey objects"""

    def __init__(self, kind=None):
        self.kind = kind

    def __repr__(self):
        return "Nothing(%s)" % self.kind

    def __bool__(self):
        return False

    def __eq__(self, other):
        try:
            return self.kind == other.kind
        except AttributeError:
            return False
