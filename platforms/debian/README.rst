Kolibri installer source for Debian
===================================

To install and subscribe to updates for Debian/Ubuntu/Raspbian, visit our PPA:

`https://launchpad.net/~learningequality/+archive/ubuntu/kolibri <https://launchpad.net/~learningequality/+archive/ubuntu/kolibri>`__


Development roadmap
-------------------

Decisions (some pending):

* This is Python 3.
* All dependencies are bundled.
* ``python3-cryptography`` is a suggested dependency
* How do we get rid of bundled c-extensions upstream (in Python pkg) and replace them with real dependencies



Installation instructions
-------------------------

Full installation instructions:

`http://kolibri.readthedocs.io/ <http://kolibri.readthedocs.io/en/latest/install.html#debian-ubuntu>`__


Automating source builds
------------------------

The layout of a Debian build is simple. You need the following to build a
version ``0.5.0.dev4``::
  
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


Workflow
--------

::



    # 1. Activate the proposed PPA
    sudo apt-add-repository ppa:learningequality/kolibri-proposed

    # 2. Uncomment the deb-src line
    sudo nano /etc/apt/sources.list.d/learningequality-ubuntu-kolibri-proposed-*.list
    sudo apt update

    # 3. Clone this repository
    git clone https://github.com/learningequality/kolibri-installer-debian.git
    cd kolibri-installer-debian
    mkdir build
    cd build/

    # 4. Fetch the latest source package
    apt-get source kolibri

    # 5. Go to the unpacked source pkg
    cd kolibri-source-<version>/
    
    # 6.1. To update from STABLE source release
    uupdate --no-symlink -v 1.2.3 /home/benjamin/code/kolibri/dist/kolibri-1.2.3.tar.gz

    # 6.2. To update to a PRE-RELEASE, notice notation here
    uupdate --no-symlink -v 1.2.3~b1 /home/benjamin/code/kolibri/dist/kolibri-1.2.3b1.tar.gz

    # 7. Making other changes...
    nano debian/somefile # etc...

    # 8. Sign off in changelog, use your PGP email address, replace "UNRELEASED" with "trusty"
    dch

    # 9. Copy your changes to git tracked path...
    ../../copy_from_pkg.sh . -c

    # 10. Commit and create PR
    git feature new-release
    git commit -m "My new debian release"

    # 11. Push changes to kolibri-proposed PPA
    dput ppa:learningequality/kolibri-proposed kolibri-source_<version>.changes

    # 12. Once built (wait for about 10 minutes), you can copy the binary pkgs to the other dist names
    ../../ppa-mg-copy-packages.py -v --debug


Bootstrapping a simple build
----------------------------

::

    # 1. Clone the debian installer repo and the kolibri source repo
    git clone https://github.com/learningequality/kolibri.git

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
    git clone https://github.com/learningequality/kolibri-installer-debian.git

    # 7. Build it (unsigned)
    debuild -uc -us


You also to run ``apt install build-essentials debhelper devscripts`` to have the necessary developer tools.

The Debian package is Python 3 *ONLY*. Python 2 users are advised to use source distribution or ``pip install`` method.

There's a recipe for Py2+3 packaging here:

 * https://wiki.debian.org/Python/LibraryStyleGuide
 * https://wiki.debian.org/Python/AppStyleGuide
