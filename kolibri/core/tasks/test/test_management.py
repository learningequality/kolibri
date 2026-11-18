from django.core.management import get_commands


def test_async_command_base_is_not_a_command():
    assert "base" not in get_commands()
