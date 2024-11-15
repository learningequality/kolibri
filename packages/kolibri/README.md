This is the kolibri JS public API. All the exports and 'exposes' fields in the package.json are available at runtime as part of the Kolibri core bundle, so JS built with the Kolibri webpack configuration will defer to a global object to read these modules at runtime.

Only the files detailed in 'exports' are available for import from this package, as per ESM conventions - to further clarify which modules are importable, all the code that is only used internally within this package is included inside folders called 'internal'. Any code inside these folders will not be directly importable.
