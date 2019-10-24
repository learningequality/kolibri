"""
This module defines a function for customizing the environment variables used
at Kolibri build time to pass into the docker build environment.

For more detail see the documentation in __init__.py
"""
import os

BUILD_ENV_PREFIX = "KOLIBRI_BUILD_"
ENVLIST_FILE = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "docker", "env.list")
)


def add_env_var_to_docker():
    envs = os.environ

    with open(ENVLIST_FILE, "a") as f:
        for env in envs:
            # Find all the environment variables prefixed with KOLIBRI_BUILD_
            # and add them to env.list to pass into docker environment after
            # removing the prefix.
            if env.startswith(BUILD_ENV_PREFIX):
                key = env.replace(BUILD_ENV_PREFIX, "")
                f.write("\n{key}={value}".format(key=key, value=envs[env]))
                print(
                    "Writing value of environment variable {} to Docker env.list\n".format(
                        key
                    )
                )


if __name__ == "__main__":
    add_env_var_to_docker()
