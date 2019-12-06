import pickle
from unittest import TestCase

from ..utils.nothing import Nothing


class TestNothing(TestCase):
    def test_nothing_is_falsey(self):
        assert not Nothing()
        assert not (Nothing() and True)

    def test_nothing_is_not_None(self):
        assert Nothing() is not None

    def test_distinction_between_different_kinds_of_nothing(self):
        assert Nothing("absence") != Nothing("boredom")

    def test_different_instances_of_the_same_kind_of_nothing_are_equivalent(self):
        assert Nothing("ness") == Nothing("ness")

    def test_nothing_survives_pickling(self):
        try:
            x = Nothing()
            pickled_nothingness = pickle.dumps(x)
            y = pickle.loads(pickled_nothingness)
            assert x == y
        except Exception:
            self.fail("we couldn't get `Nothing()` back after pickling it")
