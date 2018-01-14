<!--
 1. Following guidance below, replace …'s with your own words
 2. After saving the PR, tick of completed checklist items
 3. Skip checklist items that are not applicable or not necessary
 4. Delete instruction/comment blocks
-->

### Summary
<!--
 * description of the change
 * manual verification steps performed
 * screenshots if the PR affects the UI
-->

…

### Reviewer guidance
<!--
 * how can a reviewer test these changes?
 * are there any risky areas that deserve extra testing
-->

…

### References
<!--
 * references to related issues and PRs
 * links to mockups or specs for new features
 * links to the diffs for any dependency updates, e.g. in iceqube or the perseus plugin
-->

…

----

### Contributor Checklist

- [ ] PR has the correct target branch and milestone
- [ ] PR has 'needs review' or 'work-in-progress' label
- [ ] Contributor has fully tested the PR manually
- [ ] Screenshots of any front-end changes are in the PR description
- [ ] If PR is ready for review, a reviewer has been added. (Don't use 'Assignees')

### Reviewer Checklist

- [ ] Automated test coverage is satisfactory
- [ ] Reviewer has fully tested the PR manually
- [ ] PR has been tested for [accessibility regressions](http://kolibri-dev.readthedocs.io/en/develop/manual_testing.html#accessibility-a11y-testing)
- [ ] External dependencies files were updated (`yarn` and `pip`)
- [ ] Documentation is updated
- [ ] Link to diff of internal dependency change is included
- [ ] CHANGELOG.rst is updated for high-level changes
- [ ] Contributor is in AUTHORS.rst
