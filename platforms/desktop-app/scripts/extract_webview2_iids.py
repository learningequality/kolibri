"""
Developer utility: parse Microsoft's WebView2.h to extract the IID and vtable
layout of each ICoreWebView2_N interface. Used to derive the constants in
``src/kolibri_app/webview2_native.py`` (e.g. SHOWPRINTUI_VTBL_INDEX).

Re-run this only when adding native COM calls for newer WebView2 features.

Pre-requisite: the WebView2 SDK headers must be present at
``webview2_sdk/build/native/include/WebView2.h`` (gitignored). Fetch with::

    curl -L -o /tmp/wv2.nupkg \\
        https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.3912.50
    unzip -o /tmp/wv2.nupkg -d webview2_sdk/

The ``DECLSPEC_XFGVIRT(OwnerInterface, MethodName)`` annotations in the
C-style ICoreWebView2_NVtbl struct give us the authoritative ordered slot
list (including inherited slots) per interface.
"""
import re

HEADER = "webview2_sdk/build/native/include/WebView2.h"

with open(HEADER, encoding="utf-8") as f:
    text = f.read()

# IIDs
IID_RE = re.compile(
    r"EXTERN_C\s+__declspec\(selectany\)\s+const\s+IID\s+IID_(ICoreWebView2(?:_\d+)?)\s*=\s*\{0x([0-9A-Fa-f]+),0x([0-9A-Fa-f]+),0x([0-9A-Fa-f]+),\{([^}]+)\}\};"
)
iids = {}
for m in IID_RE.finditer(text):
    name = m.group(1)
    g1, g2, g3 = m.group(2), m.group(3), m.group(4)
    rest = m.group(5).replace("0x", "").replace(" ", "")
    parts = rest.split(",")
    iid = (
        f"{int(g1, 16):08X}-"
        f"{int(g2, 16):04X}-"
        f"{int(g3, 16):04X}-"
        f"{parts[0].zfill(2)}{parts[1].zfill(2)}-"
        f"{''.join(p.zfill(2) for p in parts[2:8])}"
    ).upper()
    iids[name] = iid

# Vtable structs: typedef struct ICoreWebView2_NVtbl { ... DECLSPEC_XFGVIRT(Owner, Method) ... } ICoreWebView2_NVtbl;
VTBL_NAME_RE = re.compile(
    r"typedef\s+struct\s+(ICoreWebView2(?:_\d+)?)Vtbl\s*\{([\s\S]*?)\}\s*\1Vtbl\s*;"
)
SLOT_RE = re.compile(r"DECLSPEC_XFGVIRT\(\s*(\w+)\s*,\s*(\w+)\s*\)")

vtables = {}
for m in VTBL_NAME_RE.finditer(text):
    name = m.group(1)
    body = m.group(2)
    vtables[name] = SLOT_RE.findall(body)

print(f"{'Interface':<22}{'IID':<40}{'vtable slots':>14}")
print("-" * 80)
for name in sorted(
    iids, key=lambda n: (0 if n == "ICoreWebView2" else int(n.rsplit("_", 1)[1]))
):
    slots = vtables.get(name, [])
    print(f"{name:<22}{iids.get(name, '?'):<40}{len(slots):>14}")

# Verify ICoreWebView2_16 layout: ShowPrintUI should be present with owner ICoreWebView2_16
target = "ICoreWebView2_16"
print()
print(f"Last 6 slots of {target}:")
for i, (owner, method) in enumerate(vtables[target][-6:]):
    idx = len(vtables[target]) - 6 + i
    print(f"  [{idx:>3}] {owner}::{method}")

# Show position of ShowPrintUI in ICoreWebView2_16
for i, (owner, method) in enumerate(vtables[target]):
    if method == "ShowPrintUI":
        print(f"\nShowPrintUI vtable index in ICoreWebView2_16: {i}")
        break
