import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture()
def hub(tmp_path):
    from hub import Hub  # noqa: PLC0415

    hub = Hub(
        host="127.0.0.1", port=0, token_file=str(tmp_path / "token"), poll_hold=0.5
    )
    hub.start()
    yield hub
    hub.stop()
