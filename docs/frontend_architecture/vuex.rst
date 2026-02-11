Vuex
====

.. warning::
  **Vuex usage is deprecated.** We are currently migrating away from Vuex to composables-based state management. For new code:

  - Use Vue composables for state management
  - Use module-level state when global state is needed (which is rare)
  - Do not add new Vuex stores or extend existing ones

  This documentation is maintained for reference while the migration is in progress.

We use the `Vuex <https://vuex.vuejs.org/>`__ library to manage state. Generally Vuex should only store data that needs to persist / be accessed between views. If this is not necessary, than local component data is a better place to store the data.

Migration to Composables
-------------------------

The project is actively migrating from Vuex to a composables-based architecture:

* **For new features:** Use Vue composables with reactive state
* **For global state:** Use module-level state (sparingly - most state should be local)
* **For existing Vuex code:** Maintain as-is until explicitly migrated, but do not extend

See :doc:`composables` for the current approach to state management.
