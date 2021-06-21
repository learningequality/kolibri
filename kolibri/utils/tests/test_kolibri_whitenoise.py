import os
import tempfile

from mock import MagicMock

from kolibri.utils.kolibri_whitenoise import DynamicWhiteNoise
from kolibri.utils.kolibri_whitenoise import FileFinder


def test_file_finder():
    tempdir1 = tempfile.mkdtemp()
    tempdir2 = tempfile.mkdtemp()
    prefix = "/test"
    tempdir1tempfile, tempdir1tempfilepath = tempfile.mkstemp(dir=tempdir1)
    tempdir2tempfile, tempdir2tempfilepath = tempfile.mkstemp(dir=tempdir2)
    tempdir1tempfilename = os.path.basename(tempdir1tempfilepath)
    tempdir2tempfilename = os.path.basename(tempdir2tempfilepath)
    file_finder = FileFinder([(prefix, tempdir1), (prefix, tempdir2)])
    assert tempdir1tempfilepath == file_finder.find(prefix + "/" + tempdir1tempfilename)
    assert tempdir2tempfilepath == file_finder.find(prefix + "/" + tempdir2tempfilename)
    assert file_finder.find("notafile") == []
    os.close(tempdir1tempfile)
    os.remove(tempdir1tempfilepath)
    os.close(tempdir2tempfile)
    os.remove(tempdir2tempfilepath)
    os.removedirs(tempdir1)
    os.removedirs(tempdir2)


def test_dynamic_whitenoise():
    tempdir11 = tempfile.mkdtemp()
    tempdir12 = tempfile.mkdtemp()
    prefix1 = "/test"
    tempdir11tempfile, tempdir11tempfilepath = tempfile.mkstemp(dir=tempdir11)
    tempdir12tempfile, tempdir12tempfilepath = tempfile.mkstemp(dir=tempdir12)
    tempdir11tempfilename = os.path.basename(tempdir11tempfilepath)
    tempdir12tempfilename = os.path.basename(tempdir12tempfilepath)
    tempdir21 = tempfile.mkdtemp()
    tempdir22 = tempfile.mkdtemp()
    prefix2 = "/notatest"
    tempdir21tempfile, tempdir21tempfilepath = tempfile.mkstemp(dir=tempdir21)
    tempdir22tempfile, tempdir22tempfilepath = tempfile.mkstemp(dir=tempdir22)
    tempdir21tempfilename = os.path.basename(tempdir21tempfilepath)
    tempdir22tempfilename = os.path.basename(tempdir22tempfilepath)
    dynamic_whitenoise = DynamicWhiteNoise(
        MagicMock(),
        dynamic_locations=[
            (prefix1, tempdir11),
            (prefix1, tempdir12),
            (prefix2, tempdir21),
            (prefix2, tempdir22),
        ],
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix1 + "/" + tempdir11tempfilename
        )
        is not None
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix1 + "/" + tempdir12tempfilename
        )
        is not None
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix2 + "/" + tempdir21tempfilename
        )
        is not None
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix2 + "/" + tempdir22tempfilename
        )
        is not None
    )
    assert dynamic_whitenoise.find_and_cache_dynamic_file("notafile") is None
    os.close(tempdir11tempfile)
    os.remove(tempdir11tempfilepath)
    os.close(tempdir12tempfile)
    os.remove(tempdir12tempfilepath)
    os.close(tempdir21tempfile)
    os.remove(tempdir21tempfilepath)
    os.close(tempdir22tempfile)
    os.remove(tempdir22tempfilepath)
    os.removedirs(tempdir11)
    os.removedirs(tempdir12)
