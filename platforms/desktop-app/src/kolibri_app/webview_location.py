LOOPBACK_IP = "127.0.0.1"


def loopback_origin(port):
    return f"http://{LOOPBACK_IP}:{port}"
