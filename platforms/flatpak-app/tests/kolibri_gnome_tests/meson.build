test(
    'Python unit tests for kolibri-gnome',
    find_program('dbus-run-session'),
    args: [
        '--config-file', dbus_session_conf,
        '--', python_installation.full_path(), '-m', 'unittest'
    ],
    env: tests_python_env,
    workdir: meson.current_source_dir()
)
