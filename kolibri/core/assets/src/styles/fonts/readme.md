
## Adding fonts

Fonts can installed using our built-in helpers, or downloaded manually and added to the
noto-manifest.json file.

We will need to add new fonts when Google releases an update, or when we add a new
language that uses a different alphabet. See our
[internationalization documentation](https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html)
for more information.


Note that we must download them from github and not the Noto site due to [this issue](https://github.com/googlei18n/noto-fonts/issues/908). To the degree possible, we should be using their
so-called "Phase 3" fonts. If a language is needed but not yet available in Phase 3
it can be added anyway, but performance might be lower.


## Naming conventions and manifest file

Fonts in the noto-sources directory must be named like:

    [Font Name]-[Weight]

We currently handle two variations on the fonts:

* [Weight] can be Regular or Bold. Both weights are required.
* [Font Name] can have a 'UI' suffix, indicating a User Interface font. A UI variant is not required.

The noto-manifest.json file tracks which fonts have been installed, and whether they
have UI variants.
