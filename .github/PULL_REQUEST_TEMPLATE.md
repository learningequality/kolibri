# Details

<!--
Using the template:

 1. Leave all headlines in place
 2. Replace instructional texts with your own words
 3. Tick of completed checklist items as you complete them
 4. If you intentionally skip a checklist item, see below instruction

Skipping items in checklists:

Tick the item checkbox, ~strikethrough item text~, and write why it was skipped, example:

- [x] ~Skipped item~ This is a documentation fix
-->

### Summary

* description of the change
* manual verification steps performed
* screenshots if the PR affects the UI

### Reviewer guidance

description of how to test the changes

### References

when applicable, please provide:

* references to related issues and PRs
* links to mockups or specs for new features
* links to the diffs for dependency updates, e.g. in iceqube or the perseus plugin

# Contributor Checklist

- [ ] PR has the correct target milestone
- [ ] PR has the appropriate labels
- [ ] If PR is ready for review, it has been assigned or requests review from someone
- [ ] Documentation is updated as necessary
- [ ] External dependency files are updated (`yarn` and `pip`)
- [ ] If internal dependency is updated, link to diff is included
- [ ] Screenshots of any front-end changes are in the PR description
- [ ] CHANGELOG.rst is updated for high-level changes
- [ ] You've added yourself to AUTHORS.rst if you're not there

# Reviewer Checklist

- [ ] Automated test coverage is satisfactory
- [ ] PR has been fully tested manually
