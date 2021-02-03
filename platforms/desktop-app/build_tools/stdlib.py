import compileall
import distutils.sysconfig as sysconfig
import os
import sys

tools_dir = os.path.dirname(os.path.abspath(__file__))

excludes = [
    'site-packages',
    'test',
    'encodings',
    'python-config',
    '__phello__',
    'this',
    'distutils',
    'antigravity',
    'tkinter',
    'idlelib',
    'lib2to3',
    'turtledemo',
    'venv.__init__'
]

if sys.platform.startswith('win'):
    # some modules are Unix-specific but don't prevent attempts to import on Windows
    excludes.extend([
        'asyncio',
        'asyncio.unix_events',
        'crypt',
        'curses',
        'dbm',
        'pty',
        'tty',
        'termios',
    ])
else:
    excludes.extend([
        '_sysconfigdata_m_linux_x86_64-linux-gnu'
    ])


def generate_python_bytecode(module_dir):
    compileall.compile_dir(module_dir)

def generate_stdlib_imports():
    """
    Packagers like py2app and pyinstaller work by running through the app looking for dependencies and packaging
    them. In our case, for Kolibri itself this is unnecessary as the Kolibri whl file contains all needed
    third-party dependencies, and packagers can get confused by this, so we avoid scanning the Kolibri dependencies.

    However, these dependencies import various parts of the Python standard library, and the packagers need to
    know about these dependencies to bundle everything necessary. Instead of writing code to scan the whl file,
    instead we just create a script that imports all modules in the standard lib so that the packages will bundle
    it all. This makes the app more flexible in that it can run code regardless of what stdlib modules it uses,
    opening the door to features like the ability to update Kolibri from within the app.
    :return:
    """
    std_lib = sysconfig.get_python_lib(standard_lib=True)
    script = ""
    modules = []
    for top, dirs, files in os.walk(std_lib):
        for nm in files:
            module_path = os.path.join(top, nm)[len(std_lib)+1:-3].replace(os.sep, '.')
            exclude = False
            for ex in excludes:
                if ex in module_path:
                    exclude = True
            if nm.endswith('.py') and not exclude:
                module_path = module_path.replace(".__init__", "")
                modules.append(module_path)

    modules.append('ctypes')
    modules.append('ctypes.wintypes')
    modules.append('logging.config')

    for module_path in modules:
        script += """
try:
    import {}
except:
    pass
    """.format(module_path, module_path)

    f = open(os.path.join(tools_dir, '..', 'src', 'stdlib_imports.py'), 'w')
    f.write(script)
    f.close()

if __name__ == '__main__':
    generate_stdlib_imports()