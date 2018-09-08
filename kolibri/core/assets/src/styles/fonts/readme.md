
## Adding fonts

Fonts can be downloaded manually, or using the `add-source-fonts` command in i18n.py.

Note that we must download them from github and not the Noto site due to [this issue](https://github.com/googlei18n/noto-fonts/issues/908).


## Naming conventions

Fonts in the noto-sources directory must be named like:

    [Font Name]-[Style]

We currently handle two variations on the fonts:

* [Style] can be either Regular or Bold
* [Font Name] can have a 'UI' suffix, indicating a User Interface font

Only 'Regular', non-UI fonts are required to exist. The other variations will be used when they're available.
