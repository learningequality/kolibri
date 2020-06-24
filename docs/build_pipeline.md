# First draft build docs

Questions to answer, based on Issue:
```
How does the build system work overall?
How do I access builds for a PR?
How do I trigger builds that are blocked?
How do I access builds for tagged releases?
How to find builds for tags?
```

- Common Procedures
  - How to download artifacts
    - Triggering a build for a specific installer

- Overview/Design Goals
- Architecture
  - Old and New
  - High level "truths"
    - Each build is associated with a commit
      The Commit _might_ have a tag.
- Custom Build Pipelines
## Design Goals
The build pipeline currently uses Buildkite as its build system. Buildkite is flexible in that the build queue is hosted on their servers, while the build agents (the servers that actually run the build scripts) are self hosted.

The design goals of the pipeline in its current iteration are chiefly:
- Continuously integrate authors' changes into a built package/installer/app (asset)
- Provide *timely* alerts to all authors of Pull Requests (PRs) and Releases to Kolibri-related projects on Github (GH)
- Make those assets available to testers and developers
- In the event of a release, make those assets available on the corresponding release page

These goals are described at a high level, and carry some implicit meaning. These implications translated to some more concrete goals in the pipeline's most recent iteration:
- For the sake of speed:
  - Build as few assets as possible automatically.
- For the the sake of convenience:
  - Allow for testers/developers to request additional assets without human intervention.
- For the sake of resilience:
  - Have 2+ build agents, distributed geographically.

There is certainly overlap in those goals. For example, a faster build translates to a more convenient release process for our release managers, who must ensure that assets build after tagging a release (LINK. more on this later).
