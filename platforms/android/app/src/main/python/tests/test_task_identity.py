from task_identity import supervisor_id_from_request

HEX = "3f2504e04f8941d39a0c0305e82c3301"


def test_dashed_request_id_normalized_to_hex():
    assert (
        supervisor_id_from_request("3f2504e0-4f89-41d3-9a0c-0305e82c3301")
        == HEX
    )


def test_dashless_request_id_is_idempotent():
    assert supervisor_id_from_request(HEX) == HEX
