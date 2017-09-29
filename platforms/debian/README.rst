Kolibri installer source for Debian
===================================

To install and subscribe to updates for Debian/Ubuntu/Raspbian, visit our PPA:

`https://launchpad.net/~learningequality/+archive/ubuntu/kolibri <https://launchpad.net/~learningequality/+archive/ubuntu/kolibri`__

Installation instructions
-------------------------

Full installation instructions will be made available in our documentation:

`http://kolibri.readthedocs.io/ <http://kolibri.readthedocs.io/>`__


Automating source builds
------------------------

The layout of a Debian build is simple. You need the following to build a
version ``0.5.0.dev4``:
  
```
build/
├── kolibri-0.5.0.dev4
│   ├── AUTHORS.rst
│   ├── CHANGELOG.rst
│   ├── CONTRIBUTING.rst
│   ├── debian
│   │   ├── changelog
│   │   ├── compat
│   │   ├── control
│   │   ├── copyright
│   │   ├── rules
│   │   └── source
│   ├── kolibri
│   │   ├── (snip)
│   ├── kolibri.egg-info
│   │   ├── (snip)
├── kolibri_0.5.0.dev4.orig.tar.gz
```



Bootstrapping a simple build
----------------------------

```
# 1. Clone the debian installer repo and the kolibri source repo
git clone https://github.com/benjaoming/kolibri.git

# 2. Make the dist files
make dist

# 3. Make a build directory
mkdir my_build

# 4. Go to the directory and copy the sdist, appending .orig like this:
cd my_build
cp ../dist/kolibri-<version>.tar.gz kolibri-<version>.orig.tar.gz

# 5. Extract it (and don't delete it!)
tar xvfz kolibri-<version>.tar.gz

# 6. Go to the sources and add the debian folder
#    (it's just the debian/ we need, but in this example we clone the whole repo)
cd kolibri-<version>
git clone https://github.com/benjaoming/kolibri-installer-debian.git

# 7. Build it (unsigned)
debuild -uc -us
```




The Debian package is Python 3 *ONLY*. Python 2 users are advised to use source distribution or ``pip install`` method.

There's a recipe for Py2+3 packaging here:

 * https://wiki.debian.org/Python/LibraryStyleGuide
 * https://wiki.debian.org/Python/AppStyleGuide
