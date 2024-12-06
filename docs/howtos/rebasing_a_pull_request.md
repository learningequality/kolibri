# Rebasing a Pull Request

On certain occasions, it might be necessary to redirect a pull request from the develop branch to the latest release branch, such as `release-v*` (e.g., `release-v0.16.x` when working on version 0.16), or vice versa. This guide outlines the steps for rebasing a feature branch related to your pull request while maintaining a clean commit history.

The demonstration centers on the process of rebasing a feature branch that is directed towards the `develop` branch in your pull request, transitioning it to the most recent release branch, identified as `release-v*`. If the need arises to rebase your pull request in the opposite direction—from `release-v*` to `develop` you can follow the same steps, just adjusting the branch names as indicated in the guide below.


   - Make sure you have local versions of the `develop` branch and the `release-v*` branch.
   - Ensure that both branches are up to date. For this guide, we'll assume they are named `develop` and `release-v*`, respectively.

Locally, checkout your feature branch and run the following rebase command:

```
git rebase --onto release-v* develop
```
This command will rebase your current feature branch onto `release-v*`, removing any commits that are already present in `develop`.

After completing the rebase, you will need to force push to update your remote branch. Use the following command:

```
git push --force
```

**Caution:** Handle force-pushes with care.
