Adding dependencies
===================

Dependencies are tracked using ``pnpm`` - `see the docs here <https://pnpm.io/>`__.

We distinguish development dependencies from runtime dependencies, and these should be installed as such using ``pnpm add --save-dev [dep]`` or ``pnpm add [dep]``, respectively. Your new dependency should now be recorded in *package.json*, and all of its dependencies should be recorded in *pnpm-lock.yaml*.

Individual plugins can also have their own package.json for their own dependencies, which are managed as part of the pnpm workspace. Running ``pnpm install`` from the root will install all dependencies for each plugin. These dependencies will only be available to that plugin at build time. Dependencies for individual plugins should be added from within the root directory of that particular plugin using ``pnpm add [dep] --filter [plugin-name]``.

To assist in tracking the source of bloat in our codebase, the command ``pnpm run bundle-stats`` is available to give a full readout of the size that uglified packages take up in the final Javascript code.

In addition, a plugin can have its own webpack config, specified inside the ``buildConfig.js`` file for plugin specific webpack configuration (loaders, plugins, etc.). These options will be merged with the base options using ``webpack-merge``.
