# Release Process with PR Rebase

Rebasing your pull requests keeps your commit history clean and integrates changes from the main branch, ensuring a smoother merge.

**Note:** the current release is tagged as `release-v*`. Replace `release-v*` with the actual version.

#### Before creating a new local working branch:
   - Make sure you have local versions of the Learning Equality `develop` branch and the Learning Equality `release-v*` branch.
   - Ensure that both branches are up to date. For this guide, we'll assume they are named `develop` and `release-v*`, respectively.
   
Checkout the upstream develop branch:
```
git checkout develop
```
After making changes to the code and committing them locally, push your working branch to your fork on GitHub:

```
git push origin develop
```

Now run the following rebase command:

```
git rebase --onto release-v* develop
```
This command will rebase your current branch `develop` onto `release-v*`, removing any commits that are already present in `develop`.

After completing the rebase, you will need to force push to update your remote branch. Use the following command:

```
git push --force
```

**Caution:** Handle force-pushes with care.

