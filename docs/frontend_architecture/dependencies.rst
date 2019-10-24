Adding dependencies
===================

Dependencies are tracked using ``yarn`` - `see the docs here <https://yarnpkg.com/en/docs/>`__.

We distinguish development dependencies from runtime dependencies, and these should be installed as such using ``yarn add --dev [dep]`` or ``yarn add [dep]``, respectively. Your new dependency should now be recorded in *package.json*, and all of its dependencies should be recorded in *yarn.lock*.

Individual plugins can also have their own package.json and yarn.lock for their own dependencies. Running ``yarn install`` will also install all the dependencies for each activated plugin (inside a node_modules folder inside the plugin itself). These dependencies will only be available to that plugin at build time. Dependencies for individual plugins should be added from within the root directory of that particular plugin.

To assist in tracking the source of bloat in our codebase, the command ``yarn run bundle-stats`` is available to give a full readout of the size that uglified packages take up in the final Javascript code.

In addition, a plugin can have its own webpack config, specified inside the ``buildConfig.js`` file for plugin specific webpack configuration (loaders, plugins, etc.). These options will be merged with the base options using ``webpack-merge``.
