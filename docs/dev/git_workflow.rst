.. _git_workflow:

Git workflow
============

.. note:: This is a work in progress, reflecting some practices already adapted
    but yet to be discussed in the community.

We do not enforce a specific Git workflow at present. You can use tools like
`git-flow <https://github.com/nvie/gitflow>`__ and
`git-extras <https://github.com/tj/git-extras/blob/master/Commands.md>`__ to
automate many tasks.


.. _branch_strategy:

Branch strategy
---------------

* ``master``: always has the latest, stable and released code.
* ``develop``: is our current development branch which all new features should
  target.
* ``releases/M.N.x`` tracks stable release series. All minor releases have a
  release tracker, so for instance ``1.0.x`` and ``1.1.x`` both have separate
  branches.
* ``features/new-thing`` tracks collaborative works on new features.

Having separate release branches requires a lot of back-porting, so ALWAYS
target **the oldest release branch** that you want a bug fix introduced in, and
then merging or cherry-picking **must** happen for all subsequent branches
following the review and merging of the oldest release branch. 