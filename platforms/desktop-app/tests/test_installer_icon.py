import re
import struct
from pathlib import Path
from pathlib import PureWindowsPath

DESKTOP_APP = Path(__file__).resolve().parents[1]
ICON = DESKTOP_APP / "src/kolibri_app/icons/kolibri.ico"


def test_installer_uses_kolibri_icon():
    script = DESKTOP_APP / "installer/kolibri.iss"
    setup = script.read_text(encoding="utf-8").split("[Setup]", 1)[1].split("\n[", 1)[0]
    directives = re.findall(r"^[ \t]*SetupIconFile[ \t]*=(.*)$", setup, re.MULTILINE)
    assert len(directives) == 1
    value = directives[0].strip()
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    icon = script.parent.joinpath(*PureWindowsPath(value).parts)
    assert icon.resolve(strict=True) == ICON


def test_installer_icon_masks_match_alpha():
    icon = ICON.read_bytes()
    required_sizes = {16, 24, 32, 48, 64, 128}
    seen_sizes = set()
    entry_count = struct.unpack_from("<H", icon, 4)[0]
    for entry in range(entry_count):
        width, height, size, offset = struct.unpack_from(
            "<BB6xII", icon, 6 + 16 * entry
        )
        if width not in required_sizes or height != width:
            continue
        payload = icon[offset : offset + size]
        assert width not in seen_sizes, f"Duplicate {width}px frame"
        assert not payload.startswith(b"\x89PNG\r\n\x1a\n"), f"PNG {width}px frame"
        seen_sizes.add(width)
        header_size, dib_width, doubled_height, _, depth = struct.unpack_from(
            "<IiiHH", payload
        )
        assert depth == 32
        assert (dib_width, doubled_height) == (width, 2 * height)
        mask_stride = ((width + 31) // 32) * 4
        mask_start = header_size + width * height * 4
        alphas = payload[header_size + 3 : mask_start : 4]
        assert any(alphas), f"Empty {width}px frame"
        for pixel, alpha in enumerate(alphas):
            row, column = divmod(pixel, width)
            mask_byte = payload[mask_start + row * mask_stride + column // 8]
            assert bool(mask_byte & (0x80 >> (column % 8))) == (alpha == 0)
    assert seen_sizes == required_sizes
