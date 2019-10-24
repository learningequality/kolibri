Single-page Apps
================

The Kolibri frontend is made of a few high-level "app" plugins, which are single-page JS applications (conventionally *app.js*) with their own base URL and a single root Vue.js component. Examples of apps are 'Learn' and 'User Management'. Apps are independent of each other, and can only reference components and styles from within themselves and from core.

Each app is implemented as a Kolibri plugin (see :doc:`/backend_architecture/plugins`), and is defined in a subdirectory of *kolibri/plugins*.

On the Server-side, the ``kolibri_plugin.py`` file describes most of the configuration for the single-page app. In particular, this includes the base Django HTML template to return (with an empty ``<body>``), the URL at which the app is exposed, and the javascript entry file which is run on load.

On the client-side, the app creates a single ``KolibriModule`` object in the entry file (conventionally *app.js*) and registers this with the core app, a global variable called ``kolibriCoreAppGlobal``. The Kolibri Module then mounts single root component to the HTML returned by the server, which recursively contains all additional components, html and logic.

Defining a new Kolibri module
-----------------------------

.. note::

  This section is mostly relevant if you are creating a new app or plugin. If you are just creating new components, you don't need to do this.

A Kolibri Module is initially defined in Python by sub-classing the ``WebpackBundleHook`` class (in ``kolibri.core.webpack.hooks``). The hook defines the JS entry point (conventionally called *app.js*) where the ``KolibriModule`` subclass is instantiated, and where events and callbacks on the module are registered. These are defined in the ``events`` and ``once`` properties. Each defines key-value pairs of the name of an event, and the name of the method on the ``KolibriModule`` object. When these events are triggered on the Kolibri core JavaScript app, these callbacks will be called. (If the ``KolibriModule`` is registered for asynchronous loading, the Kolibri Module will first be loaded, and then the callbacks called when it is ready. See :doc:`/frontend_architecture/frontend_build_pipeline` for more information.)

All apps should extend the ``KolibriModule`` class found in `kolibri/core/assets/src/kolibri_module.js`.

The ``ready`` method will be automatically executed once the Module is loaded and registered with the Kolibri Core App. By convention, JavaScript is injected into the served HTML *after* the ``<rootvue>`` tag, meaning that this tag should be available when the ``ready`` method is called, and the root component (conventionally in *vue/index.vue*) can be mounted here.

Content renderers
-----------------

A special kind of Kolibri Module is dedicated to rendering particular content types. All content renderers should extend the ``ContentRendererModule`` class found in `kolibri/core/assets/src/content_renderer_module.js`. In addition, rather than subclassing the ``WebpackBundleHook`` class, content renderers should be defined in the Python code using the ``ContentRendererHook`` class defined in ``kolibri.content.hooks``. In addition to the standard options for the ``WebpackBundleHook``, the ``ContentRendererHook`` also requires a ``presets`` tuple listing the format presets that it will render.

.. automodule:: kolibri.core.content.hooks
    :members:
    :noindex:

The ``ContentRendererModule`` class has one required property ``getRendererComponent`` which should return a Vue component that wraps the content rendering code. This component will be passed ``files``, ``file``, ``itemData``, ``preset``, ``itemId``, ``answerState``, ``allowHints``, ``extraFields``, ``interactive``, ``lang``, ``showCorrectAnswer``, ``defaultItemPreset``, ``availableFiles``, ``defaultFile``, ``supplementaryFiles``, ``thumbnailFiles``, ``contentDirection``, and ``contentIsRtl`` props, defining the files associated with the piece of content, and other required data for rendering. These will be automatically mixed into any content renderer component definition when loaded. For more details of these props see *packages/kolibri-components/src/content/mixin.js*, *packages/kolibri-components/src/content/KContentRenderer.js*, and how they are used in the different content renderer plugins that come with Kolibri.

In order to log data about users viewing content, the component should emit ``startTracking``, ``updateProgress``, and ``stopTracking`` events, using the Vue ``$emit`` method. ``startTracking`` and ``stopTracking`` are emitted without any arguments, whereas ``updateProgress`` should be emitted with a single value between 0 and 1 representing the current proportion of progress on the content.

.. code-block:: javascript

  this.$emit('startTracking');
  this.$emit('stopTracking');
  this.$emit('updateProgress', 0.25);

For content that has assessment functionality three additional props will be passed: ``itemId``, ``answerState``, and ``showCorrectAnswer``. ``itemId`` is a unique identifier for that content for a particular question in the assessment, ``answerState`` is passed to prefill an answer (one that has been previously given on an exam, or for a coach to preview a learner's given answers), ``showCorrectAnswer`` is a Boolean that determines if the correct answer for the question should be automatically prefilled without user input - this will only be activated in the case that ``answerState`` is falsy - if the renderer is asked to fill in the correct answer, but is unable to do so, it should emit an ``answerUnavailable`` event.

The answer renderer should also define a ``checkAnswer`` method in its component methods, this method should return an object with the following keys: ``correct``, ``answerState``, and ``simpleAnswer`` - describing the correctness, an object describing the answer that can be used to reconstruct it within the renderer, and a simple, human readable answer. If no valid answer is given, ``null`` should be returned. In addition to the base content renderer events, assessment items can also emit a ``hintTaken`` event to indicate that the user has taken a hint in the assessment, an ``itemError`` event to indicate that there has been an error in rendering the requested question corresponding to the ``itemId``, and an ``interaction`` event that indicates a user has interacted with the assessment.

.. code-block:: javascript

  {
    methods: {
      checkAnswer() {
        return {
          correct: true,
          answerState: {
            answer: 81,
            working: '3^2 = 3 * 3',
          },
          simpleAnswer: '81',
        };
      },
    },
  };
