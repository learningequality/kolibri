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

Submissions
~~~~~~~~~~~

Be sure to follow the `instructions <https://github.com/learningequality/kolibri/blob/develop/.github/PULL_REQUEST_TEMPLATE.md>`__ shown in the Github PR template when you `create a new PR <https://github.com/learningequality/kolibri/compare>`__.

In particular, **please use the labels** "Needs review", "Work in progress", and "Needs updates" mutually exclusively to communicate the state of the PR.

Developers maintain their own clones of the Learning Equality `Kolibri repo <https://github.com/learningequality/kolibri/>`__ in their personal Github accounts, and `submit pull requests <https://help.github.com/articles/creating-a-pull-request/>`__ back to the LE repo.

Every pull request will require some combination of manual testing, code review, automated tests, gherkin stories, and UI design review. Developers must fully test their own code before requesting a review, and then closely follow the template and checklist that appears in the PR description. All automated tests must pass.

Unit tests and gherkin stories should be written to ensure coverage of critical, brittle, complicated, or otherwise risky paths through the code and user experience. Intentional, thoughtful coverage of these critical paths is more important than global percentage of code covered.

Try to keep PRs as self-contained as possible. The bigger the PR, the more challenging it is to review, and the more likely that merging will be blocked by various issues. If your PR is not being reviewed in a timely manner, reach out to stakeholders and politely remind them that you're waiting for a review.


Some additional guidelines:

* Submitters should fully test their code *before* asking for a review
* If the PR is languishing, feel free to prod team members for review
* Try to keep the PR up-to-date with the target branch
* Make sure to use the checkboxes in the PR template


Git history
~~~~~~~~~~~

Within the Kolibri repo, we have the following primary rule:

    *Never* rewrite history on shared branches.

History has been rewritten if a force push is required to update the remote. This will occur from e.g. amending commits, squashing commits, and rebasing a branch.

Some additional git history guidance:

* Be encouraged to rewrite history on personal branches so that your git commits tell a story
* Avoid noisy, meaningless commits such as "fixed typo". Squash these prior to submitting a PR
* When possible, make each commit a self-contained change that plays nicely with ``git bisect``
* Once a PR code review has occurred, avoid squashing subsequent changes as this makes it impossible to see what changes were made since the code review
* Don't worry too much about a "clean" commit history. It's better to have some messy commits than to waste an hour than debugging a rebase-gone-wrong


Code Reviews
~~~~~~~~~~~~

When reviewing PRs, keep feedback focused on critical changes. Lengthy conversations should be moved to a real-time chat when possible. Be polite, respectful, and constructive. We highly recommend following the `guidance in this blog post <https://medium.freecodecamp.org/unlearning-toxic-behaviors-in-a-code-review-culture-b7c295452a3c>`__.

Some general guidelines:

* Reviewers should actually run and test the PR
* When giving opinions, clarify whether the comment is meant to be a “blocking” comment or if it is just a conversation
* Pre-existing issues or other cleanup suggestions are can be opened as new issues, or mentioned as “non-blocking” comments
* Code formatting comments should be rare because we use Prettier and Black

Finally, if you see a very trivial but important necessary change, the reviewer can `commit the change directly to a pull request branch <https://help.github.com/en/articles/committing-changes-to-a-pull-request-branch-created-from-a-fork>`__. This can greatly speed up the process of getting a PR merged. Pushing commits to a submitter's branch should only be done for non-controversial changes or with the submitter's permission.

.. note::
  When pushing to another user's branch, you may get an error like:

    ``Authentication required: You must have push access to verify locks``

  This is due to a `Git LFS bug <https://github.com/git-lfs/git-lfs/issues/2291>`__. Try `disabling lock verification <https://github.com/git-lfs/git-lfs/blob/master/docs/man/git-lfs-config.5.ronn#other-settings>`__ using the ``lfs.[remote].locksverify`` setting, or simply running ``rm -rf .git/hooks/pre-push``.


.. note::
  Remember to keep the "Needs review", "Work in progress", and "Needs updates" mutually exclusive and up-to-date.


Merging PRs
~~~~~~~~~~~

Who should merge PRs, and when?

First, all automated checks need to pass before merging. Then...

* If there is just one reviewer and they approve the changes, the reviewer should merge the PR immediately
* If there are multiple reviewers or stakeholders, the last one to approve can merge
* The reviewer might approve the PR, but also request minor changes such as a typo fix or variable name update. The submitter can then make the change and merge it themselves, with the understanding that the new changes will be limited in scope
* Stale reviews should be dismissed by the PR submitter when the feedback has been addressed


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


Within the Learning Equality Kolibri repository:

* The ``develop`` branch is our current development branch, and the default target for PRs
* Release branches named like ``release-v1.2.x`` (for example). This will track all patch releases within the 1.2.x minor release line. Distinct releases are tracked as tags like ``v1.2.3``
* We sometimes create feature branches for changes that are long-running, collaborative, and disruptive. These should be kept up-to-date with ``develop`` by merging, not rebasing.

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
