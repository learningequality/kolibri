from django.test import SimpleTestCase

from kolibri.core.decorators import InvalidQueryParamsException
from kolibri.core.decorators import ParamValidator


class ParamValidatorTestCase(SimpleTestCase):
    def test_eq_constraint_message_says_equal_to(self):
        validator = ParamValidator("count")
        validator.set_type(int)
        validator.eq = 5

        with self.assertRaises(InvalidQueryParamsException) as ctx:
            validator.check_value_constraints(7)

        self.assertIn("must be equal to 5", str(ctx.exception))

    def test_invalid_bool_param_raises_query_params_exception(self):
        validator = ParamValidator("flag")
        validator.set_type(bool)

        with self.assertRaises(InvalidQueryParamsException):
            validator.check_non_tuple_types("yes")
