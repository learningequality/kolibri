from kolibri.utils.conf import OPTIONS


def local_host():
    address = OPTIONS["Deployment"]["LISTEN_ADDRESS"]
    return "127.0.0.1" if address == "0.0.0.0" else address


def local_origin(port):
    return f"http://{local_host()}:{port}"
