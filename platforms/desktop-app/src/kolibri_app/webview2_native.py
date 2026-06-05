"""
Direct COM access to the WebView2 control underlying ``wx.html2.WebView``
on Windows. Used to call ``ICoreWebView2_16::ShowPrintUI`` since
wxPython 4.2.2's ``WebView.Print()`` is a no-op on the Edge backend (it
predates the SDK version that introduced ShowPrintUI).

We use raw ctypes against the COM vtable rather than comtypes to keep the
dependency surface minimal. The vtable layout below was extracted from
WebView2.h (Microsoft.Web.WebView2 NuGet package); see
``scripts/extract_webview2_iids.py`` for how to regenerate it.
"""

import ctypes

HRESULT = ctypes.c_int  # 32-bit signed
LPVOID = ctypes.c_void_p


class GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", ctypes.c_uint32),
        ("Data2", ctypes.c_uint16),
        ("Data3", ctypes.c_uint16),
        ("Data4", ctypes.c_ubyte * 8),
    ]


def _guid(d1, d2, d3, *d4):
    g = GUID()
    g.Data1 = d1
    g.Data2 = d2
    g.Data3 = d3
    for i, b in enumerate(d4):
        g.Data4[i] = b
    return g


# ICoreWebView2_16 — adds Print, ShowPrintUI, PrintToPdfStream.
# Available at runtime in any WebView2 Runtime >= 1.0.1518.46 (mid-2022).
IID_ICoreWebView2_16 = _guid(
    0x0EB34DC9,
    0x9F91,
    0x41E1,
    0x86,
    0x39,
    0x95,
    0xCD,
    0x59,
    0x43,
    0x90,
    0x6B,
)

# Vtable slot of ShowPrintUI on ICoreWebView2_16 (zero-based, includes the
# three IUnknown slots). Don't change without re-running
# scripts/extract_webview2_iids.py.
SHOWPRINTUI_VTBL_INDEX = 114

# COREWEBVIEW2_PRINT_DIALOG_KIND
PRINT_DIALOG_KIND_BROWSER = 0  # WebView2's in-page print preview overlay
PRINT_DIALOG_KIND_SYSTEM = 1  # OS print dialog (separate window)


# Function prototypes for raw vtable invocation. WINFUNCTYPE = stdcall.
_PFN_QueryInterface = ctypes.WINFUNCTYPE(
    HRESULT,
    LPVOID,  # this
    ctypes.POINTER(GUID),  # riid
    ctypes.POINTER(LPVOID),  # ppvObject
)
_PFN_Release = ctypes.WINFUNCTYPE(ctypes.c_ulong, LPVOID)
_PFN_ShowPrintUI = ctypes.WINFUNCTYPE(HRESULT, LPVOID, ctypes.c_int)


_PTR_SIZE = ctypes.sizeof(LPVOID)


def _vtable_slot(this_ptr, index):
    """Read pointer at vtbl[index] of the COM object at ``this_ptr``."""
    vtbl_addr = LPVOID.from_address(this_ptr).value
    fn_addr = LPVOID.from_address(vtbl_addr + index * _PTR_SIZE).value
    return fn_addr


def _query_interface(this_ptr, iid):
    """Call IUnknown::QueryInterface; return the new interface pointer (int)."""
    qi_fn = _PFN_QueryInterface(_vtable_slot(this_ptr, 0))
    out = LPVOID()
    hr = qi_fn(this_ptr, ctypes.byref(iid), ctypes.byref(out))
    if hr != 0 or not out.value:
        raise OSError(f"QueryInterface failed (hr=0x{hr & 0xFFFFFFFF:08X})")
    return out.value


def _release(this_ptr):
    fn = _PFN_Release(_vtable_slot(this_ptr, 2))
    return fn(this_ptr)


def show_print_ui(native_backend_ptr, dialog_kind=PRINT_DIALOG_KIND_BROWSER):
    """Open the WebView2 print UI for the given native backend pointer.

    ``native_backend_ptr`` is the integer returned by
    ``wx.html2.WebView.GetNativeBackend()`` on the Edge backend, where it is
    an ``ICoreWebView2_2*``. We QI for ``ICoreWebView2_16`` (introduced in
    a later runtime than wxWidgets 3.2.x targets) and invoke ShowPrintUI.
    """
    # wxPython hands the native backend back as a sip.voidptr; coerce to int.
    ptr = int(native_backend_ptr) if native_backend_ptr else 0
    if not ptr:
        raise ValueError("native_backend_ptr is null")

    iface16 = _query_interface(ptr, IID_ICoreWebView2_16)
    try:
        fn = _PFN_ShowPrintUI(_vtable_slot(iface16, SHOWPRINTUI_VTBL_INDEX))
        hr = fn(iface16, dialog_kind)
        if hr != 0:
            raise OSError(f"ShowPrintUI failed (hr=0x{hr & 0xFFFFFFFF:08X})")
    finally:
        _release(iface16)
