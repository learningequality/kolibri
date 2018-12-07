Layout of frontend code
=======================

Frontend code and assets are generally contained in one of two places: either in one of the plugin subdirectories (under *kolibri/plugins*) or in *kolibri/core*, which contains code shared across all plugins as described below.

Within these directories, there should be an *assets* directory with *src* and *test* under it. Most assets will go in *src*, and tests for the components will go in *test*.

For example:

.. code-block:: none

  kolibri/
    core/                             # core (shared) items
      assets/
        src/
          CoreBase.vue                # global base template, used by plugins
          CoreModal.vue               # example of another shared component
          core-global.scss            # globally defined styles, included in head
          core-theme.scss             # style variable values
          font-noto-sans.css          # embedded font
        test/
          ...                         # tests for core assets
    plugins/
      learn                           # learn plugin
        assets/
          src/
            views/
              LearnIndex.vue          # root view
              SomePage.vue            # top-level client-side page
              AnotherPage/            # top-level client-side page
                index.vue
                Child.vue             # child component used only by parent
              Shared.vue              # shared across this plugin
            app.js                    # instantiate learn app on client-side
            router.js
            store.js
          test/
            app.js
      management/
        assets/
          src/
            views/UserPage.vue        # nested-view
            views/ManagementIndex.vue # root view
            app.js                    # instantiate mgmt app on client-side
          test/
            app.js


In the example above, the *views/AnotherPage/index.vue* file in *learn* can use other assets in the same directory (such as *Child.vue*), components in *views* (such as *Shared.vue*), and assets in core (such as variables in *core-theme.scss*). However it cannot use files in other plugin directories (such as *management*).

.. note::

  For many development scenarios, only files in these directories need to be touched.

  There is also a lot of logic and configuration relevant to frontend code loading, parsing, testing, and linting. This includes webpack, NPM, and integration with the plugin system. This is somewhat scattered, and includes logic in *frontend_build/...*, *package.json*, *kolibri/core/webpack/...*, and other locations. Much of this functionality is described in other sections of the docs (such as :doc:`./frontend_build_pipeline`), but it can take some time to understand how it all hangs together.
