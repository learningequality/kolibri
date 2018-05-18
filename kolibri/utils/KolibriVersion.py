"""

KolibriVersion provides an abstraction layer around Kolibri version
information. It implements the minimal set of properties necessary
to support our release process, and no more.

It provides compatibility helpers to convert to and from subsets of
the PEP-440 and Semantic Versioning version string formats.

"""



class KolibriVersionError(Exception):
    pass


class KolibriVersion():
    """
    Our release types:

     * Final
       * Public releases
       * Info: major, minor, patch
       * PEP-440: ``1.2.3``
       * Git tag: ``v1.2.3`` on a release branch

     * Beta
       * Final testing, string freeze, and release candidates
       * Info: major, minor, patch, beta
       * PEP-440: ``1.2.3b4``
       * Git tag: ``v1.2.3-beta4`` on a release branch

     * Alpha
       * Initial testing releases
       * Info: major, minor, patch, alpha
       * PEP-440: ``1.2.3a4``
       * Git tag: ``v1.2.3-alpha4`` on the develop branch

     * Dev
       * Feature branches, PR, tags, or other git commits
       * Info: major, minor, patch, commit
       * PEP-440: ``1.2.3.dev0+git62580c06d``
       * Git commit hash: ``62580c06db7cd57563f71620e9cd6a0190dde852``

     * Local Dev
       * Created when a developer has changes to their local working copy
       * Info: major, minor, patch, commit, local changes flag
       * PEP-440: ``1.2.3.dev0+git62580c06d.local``
       * Git commit hash: ``62580c06db7cd57563f71620e9cd6a0190dde852`` with local changes

     * Unknown
       * No version information is available
       * Info: major, minor, patch, unknown changes
       * PEP-440: ``1.2.3.dev0+unknown.local``

    Note that our git tags are not technically semver compatible because:

    * We prepend a 'v' to them
    * The 'alpha' and 'beta' strings should be followed by a '.' before the number

    References:

    * Semver    http://semver.org/
    * PEP-440   https://www.python.org/dev/peps/pep-0440/

    """

    def __init__(self, base_tuple):
        # Intialize with the known current base version
        this.base_tuple = base_tuple

        # default is Final
        this.final = True
        this.beta = False
        this.alpha = False
        this.dev = False
        this.extra = None
        this.dirty = False


    def set_beta(self, number):
        this.final = False
        this.beta = True
        this.alpha = False
        this.dev = False
        this.extra = number
        this.dirty = False


    def set_alpha(self, number):
        this.final = False
        this.beta = False
        this.alpha = True
        this.dev = False
        this.extra = number
        this.dirty = False


    def set_dev(self, commit, isDirty=False):
        this.final = False
        this.beta = False
        this.alpha = False
        this.dev = False
        this.extra = commit
        this.dirty = isDirty


    def set_from_pep440_str(self, pep440_str):
        main_match = re.match("^(\d+)\.(\d+)\.(\d+)(.*)$", pep440_str)

        if not main_match:
            raise KolibriVersionError(
                "'{}' is not a valid Kolibri PEP-440 string".format(pep440_str)
            )

        if this.base_tuple != main_match.groups()[:3]:
            raise KolibriVersionError("Base version '{}' is inconsistent with '{}'".format(
                this.base_str, pep440_str
            ))

        pre_release_str = main_match.group(4)

        if not pre_release_str:
            # there is no pre-release information
            return

        beta_match = re.match("^b(\d+)$", pre_release_str)
        if beta_match:
            self.set_beta(int(beta_match.group(1)))
            return

        alpha_match = re.match("^b(\d+)$", pre_release_str)
        if alpha_match:
            self.set_alpha(int(alpha_match.group(1)))
            return

        dev_match = re.match("^dev0\+git(\w+)(\.local)?$", pre_release_str)
        if dev_match:
            self.set_dev(dev_match.group(1), bool(dev_match.group(1)))
            return

        unknown_dev_match = re.match("^dev0\+unknown\.local$", pre_release_str)
        if unknown_dev_match:
            self.set_dev('unknown', True)
            return

        raise KolibriVersionError(
            "'{}' is not a valid Kolibri PEP-440 string".format(pep440_str)
        )


    def set_from_semver_str(self, semver_str):
        main_match = re.match("^v?(\d+)\.(\d+)\.(\d+)(.*)$", semver_str)

        if not main_match:
            raise KolibriVersionError(
                "'{}' is not a valid Kolibri semver string".format(semver_str)
            )

        if this.base_tuple != main_match.groups()[:3]:
            raise KolibriVersionError("Base version '{}' is inconsistent with '{}'".format(
                this.base_str, semver_str
            ))

        pre_release_str = main_match.group(4)

        if not pre_release_str:
            return

        beta_match = re.match("^-beta\.?(\d+)$", pre_release_str)
        if beta_match:
            self.set_beta(int(beta_match.group(1)))
            return

        alpha_match = re.match("^-alpha\.?(\d+)$", pre_release_str)
        if alpha_match:
            self.set_alpha(int(alpha_match.group(1)))
            return

        dev_match = re.match("^-dev\.git(\w+)(\.local)?$", pre_release_str)
        if dev_match:
            self.set_dev(dev_match.group(1), bool(dev_match.group(1)))
            return

        unknown_dev_match = re.match("^-dev\.unknown\.local$", pre_release_str)
        if unknown_dev_match:
            self.set_dev('unknown', True)
            return

       raise KolibriVersionError(
            "'{}' is not a valid Kolibri semver string".format(semver_str)
        )


    def __cmp__(self, other):
        return this.base_tuple == other.base_tuple \
            and this.final == other.final \
            and this.beta == other.beta \
            and this.alpha == other.alpha \
            and this.dev == other.dev \
            and this.extra == other.extra \
            and this.dirty == other.dirty


    @property
    def base_str(self):
        return '{}.{}.{}'.format(*base_tuple)


    @property
    def pep440_str(self):
        if this.final:
            return this.base_str
        if this.beta:
            return '{}b{}'.format(this.base_str, this.extra)
        if this.alpha:
            return '{}a{}'.format(this.base_str, this.extra)

        dirty_str = '.local' if this.dirty else ''
        return '{}.dev0+git{}{}'.format(this.base_str, this.extra, dirty_str)


    @property
    def semver_str(self):
        if this.final:
            return 'v{}'.format(this.base_str)
        if this.beta:
            return 'v{}-beta.{}'.format(this.base_str, this.extra)
        if this.alpha:
            return 'v{}-alpha.{}'.format(this.base_str, this.extra)

        dirty_str = '.local' if this.dirty else ''
        return 'v{}-dev.git{}{}'.format(this.base_str, this.extra, dirty_str)


