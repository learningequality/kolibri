tests_python_env = environment()

tests_python_env.append(
    'PYTHONPATH',
    join_paths(meson.project_build_root(), 'src'),
    join_paths(meson.project_source_root(), 'src')
)

tests_python_env.append(
    'LD_LIBRARY_PATH',
    join_paths(meson.project_build_root(), 'src', 'libkolibri_daemon_dbus')
)

tests_python_env.append(
    'GI_TYPELIB_PATH',
    join_paths(meson.project_build_root(), 'src', 'libkolibri_daemon_dbus')
)

subdir('kolibri_gnome_tests')
