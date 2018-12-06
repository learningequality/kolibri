.. _dev_workflow:

Development workflow
====================

Git workflow
------------

At a high level, we follow the 'Gitflow' model. Some helpful references:

- `Atlassian tutorial <https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow/>`__
- `Original description <http://nvie.com/posts/a-successful-git-branching-model/>`__


Pull requests
-------------

Be sure to follow the `instructions <https://github.com/learningequality/kolibri/blob/develop/.github/PULL_REQUEST_TEMPLATE.md>`__ shown in the Github PR template when you `create a new PR <https://github.com/learningequality/kolibri/compare>`__.

Developers maintain their own clones of the Learning Equality `Kolibri repo <https://github.com/learningequality/kolibri/>`__ in their personal Github accounts, and `submit pull requests <https://help.github.com/articles/creating-a-pull-request/>`__ back to the LE repo.

Every pull request (with a couple minor exceptions) requires testing, code review, automated tests, and potentially UI design review. Developers must fully test their own code before requesting a review, and then closely follow the template and checklist that appears in the PR description. All automated tests must pass.

Try to keep PRs as self-contained as possible. The bigger the PR, the more challenging it is to review, and the more likely that merging will be blocked by various issues. If your PR is not being reviewed in a timely manner, reach out to stakeholders and politely remind them that you're waiting for a review.

When reviewing PRs, keep feedback focused on critical changes. Lengthy conversations should be moved to a real-time chat when possible. In many situations it is preferable to open a new issue for follow-up changes rather than blocking merging of the PR.

Be polite, respectful, and constructive. We highly recommend following the `guidance in this blog post <https://medium.freecodecamp.org/unlearning-toxic-behaviors-in-a-code-review-culture-b7c295452a3c>`__.


Git history
-----------

Within the Kolibri repo, we have the following primary rule:

    *Never* rewrite history on shared branches.

History has been rewritten if a force push is required to update the remote. This will occur from e.g. amending commits, squashing commits, and rebasing a branch.

Some additional git history guidance:

* Be encouraged to rewrite history on personal branches so that your git commits tell a story
* Avoid noisy, meaningless commits such as "fixed typo". Squash these prior to submitting a PR
* When possible, make each commit a self-contained change that plays nicely with ``git bisect``
* Once a PR code review has occurred, avoid squashing subsequent changes as this makes it impossible to see what changes were made since the code review
* Don't worry too much about a "clean" commit history. It's better to have some messy commits than to waste an hour than debugging a rebase-gone-wrong


Development phases
------------------

We have the following release types:

* Final
   * Public releases
   * Info: major, minor, patch
   * PEP-440: ``1.2.3``
   * Git tag: ``v1.2.3`` on a release branch
* Beta
   * Final integration testing, string freeze, and beta release candidates
   * High level of risk-aversion in PRs
   * Info: major, minor, patch, beta
   * PEP-440: ``1.2.3b4``
   * Git tag: ``v1.2.3-beta4`` on a release branch
* Alpha
   * Initial testing releases
   * Avoid broken builds in PRs
   * Info: major, minor, patch, alpha
   * PEP-440: ``1.2.3a4``
   * Git tag: ``v1.2.3-alpha4`` on the develop branch
* Dev
   * Feature branches, PRs, or other git commits
   * Info: major, minor, patch, commit
   * Experimental work is OK


Within the learning equality repository:

* The ``develop`` branch is our current development branch, and the default target for PRs
* Release branches named like ``release-v1.2.x`` (for example). This will track all patch releases within the 1.2.x minor release line. Distinct releases are tracked as tags like ``v1.2.3``
* We sometimes create feature branches for changes that are long-running, collaborative, and disruptive. These should be kept up-to-date with ``develop`` by merging, not rebasing.
* The ``master`` branch should be the same as the latest stable release

If a change needs to be introduced to an older release, target the oldest release branch that we want the change made in. Then that change will need to be merged into all subsequent releases, one-at-a-time, until it eventually gets back to ``develop``.


Github labels
-------------

We use a `wide range of labels <https://github.com/learningequality/kolibri/labels>`__ to help organize issues and pull requests in the Kolibri repo.


Priority
~~~~~~~~

These are used to sort issues and sometimes PRs by priority if *and only if* the item is assigned a milestone. Every issue in a milestone ought to have a priority label.

Only 'critical' items are strictly blockers for a release, but typically all important items should be expected to make it in, too. Priority within a release is generally assigned by a core Learning Equality team member.

* **P0 - critical**
* **P1 - important**
* **P2 - normal**
* **P3 - low**


Changelog
~~~~~~~~~

The **changelog** label is used on PRs or issues to generate 'more details' links in the :ref:`changelog`.


Work-in-progress
~~~~~~~~~~~~~~~~

The **work-in-progress** label is helpful if you have a PR open that's not ready for review yet.


Development category
~~~~~~~~~~~~~~~~~~~~

Labels prefixed with **DEV:** are used to help organize issues (and sometimes PRs) by area of responsibility or scope of domain knowledge necessary.


TODO items
~~~~~~~~~~

Labels prefixed with  **TODO:** help flag items that need some action before the issue or PR can be fully resolved.


Organizational Tags
~~~~~~~~~~~~~~~~~~~

Labels prefixed with **TAG:** are general-purpose, and are used to help organize issues and PRs.
