import os

with open(os.path.join(os.path.dirname(__file__), "windows_wmic_output.txt")) as f:
    wmic_txt = f.read()

popen_responses = {
    "wmic logicaldisk": wmic_txt,
}

os_access_read = {
    "C:\\": True,
    "D:\\": True,
    "E:\\": False,
}

os_access_write = {
    "C:\\": True,
    "D:\\": False,
    "E:\\": False,
}

has_kolibri_data_folder = {
    "C:\\": False,
    "D:\\": True,
    "E:\\": False,
}
