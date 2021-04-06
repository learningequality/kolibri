<!--
 1. Following guidance below, replace …'s with your own words
 2. After saving the PR, tick of completed checklist items
 3. Skip checklist items that are not applicable or not necessary
 4. Delete instruction/comment blocks
-->

## Summary
<!--
 * description of the change
 * manual verification steps performed
 * screenshots if the PR affects the UI
-->

…

## References
<!--
 * references to related issues and PRs
 * links to mockups or specs for new features
 * links to the diffs for any dependency updates, e.g. in iceqube or the perseus plugin
-->

…

## Reviewer guidance
<!--
 * how can a reviewer test these changes?
 * are there any risky areas that deserve extra testing
-->

…

----

## Testing checklist

- [ ] Contributor has fully tested the PR manually
- [ ] If there are any front-end changes, before/after screenshots are included
- [ ] Critical user journeys are covered by Gherkin stories
- [ ] Critical and brittle code paths are covered by unit tests


## PR process

- [ ] PR has the correct target branch and milestone
- [ ] PR has 'needs review' or 'work-in-progress' label
- [ ] If PR is ready for review, a reviewer has been added. (Don't use 'Assignees')
- [ ] If this is an important user-facing change, PR or related issue has a 'changelog' label
- [ ] If this includes an internal dependency change, a link to the diff is provided

## Reviewer checklist

- Automated test coverage is satisfactory
- PR is fully functional
- PR has been tested for [accessibility regressions](http://kolibri-dev.readthedocs.io/en/develop/manual_testing.html#accessibility-a11y-testing)
- External dependency files were updated if necessary (`yarn` and `pip`)
- Documentation is updated
- Contributor is in AUTHORS.md
