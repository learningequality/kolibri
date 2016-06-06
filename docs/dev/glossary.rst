Glossary
=====================


Words with special meanings in the Kolibri ecosystem.


App
  A Kolibri 'app' is a special sort of plugin which provides a top-level URL and a self-contained single-page javascript application. Each app generally has a single client-side ``KolibriModule`` object and attaches a single root view component to the HTML returned by a skeleton Django template.

  Examples of apps are the Learn, Admin, and Coach Reports apps.

Bundle
  'Bundle' is a webpack term. *TODO*

Component
  A 'view component' is a composable UI element on the client-side, defined using Vue.js components.

  Components are defined using using HTML, other components, styling, internationalized text, internal logic, and – if necessary – internal state. Every component has an interface defined by its input parameters, events, and slots that can take arbitrary HTML to render in itself.

  See :doc:`frontend` for more info.

Hook
  A 'hook' is the server-side mechanism by which plugins interact with each other and with the core app. Hooks allow behaviors and interactions to be defined abstractly by Kolibri core and then implemented concretely by plugins.

  See :doc:`plugins` for more info.

Plugin
  Kolibri 'plugins' define both functionality client- and server-side functionality. They can be enabled and disabled on a per-installation basis. Plugins are decoupled from each other, but are dependent on the core Kolibri application.

  In theory, any plugin can be disabled and the application should still function without error, albeit limited functionality.

  Examples of plugins include the Learn application, and a content renderer for vector video.

  See :doc:`plugins` for more info.
