# Running Kolibri with local Kolibri Design System

Kolibri uses components from [Kolibri Design System](https://github.com/learningequality/kolibri-design-system) (KDS). KDS is installed in Kolibri as a usual npm dependency.

It is sometimes useful to run Kolibri development server linked to local KDS repository, for example to confirm that a KDS update fixes bug observed in Kolibri, when developing new KDS feature in support of Kolibri feature, etc.

For this purpose, Kolibri provides `devserver-with-kds` command that will run the development server with Kolibri using local KDS:

```bash
yarn run devserver-with-kds <kds-path>
```

where `<kds-path>` is the path of the local `kolibri-design-system` repository.

.. warning::
  Some developers have reported issues when running the command with a relative path. If you encounter any problems, try using an absolute KDS path.
