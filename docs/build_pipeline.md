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
  - Buildkite
  - Arhitecture
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

## Architecture
Before describing the current architecture, it might be helpful to provide context by giving an overview of how Buildkite works.

### Buildkite
This entire section will not be describing any of LE's build pipelines in particular - only how Buildkite manages pipelines.

 Without diving too deep (LINK please visit their official documentation if you'd like more detail), the Buildkite product has 2 main components, (illustrated on this page (LINK to agent page)):

1. The Buildkite Agent API
2. The Buildkite Agent Daemon

#### API
The API is hosted on Buildkite servers. It's primary purpose is to receive build _steps_ in the form of (mostly) YAML, and distribute them as _jobs_ to Agents.

In this context, a _step_ is a YAML-formatted instruction - in all of our projects, our steps live inside of `.buildkite/pipeline.yml`.

A _job_, in this context, is the process or shell that is carrying out the instructions in the step. Jobs can run on any of the Agents connected to our account's Buildkite API.

Apart from the job allocation functionality, Buildkite conveniently provides us with:
- A Webhook server/client
- A web UI
- Ephemeral asset hosting

##### Github Integration
The Webhook client functionality is critical, as it allows us to integrate with Github.

Github alerts Buildkite that a new PR, commit, or tag has been created via webhook. This spurs the Buildkite servers to create a job, instructing the Agent to pull the GH repo and send Buildkite the steps it needs to be carried out.

That job, and its corresponding step, is the only one that cannot live inside of a repo. This _must_ be defined on Buildkite's servers using their web GUI (LINK to step creation).

#### Agent
The agent is hosted on LE servers. Some of these servers are physically located in the LE physical office, and others are physically located in a cloud provider's server farm.

All of these servers have a Buildkite Agent application installed as a background service. It's primary purpose is to receive jobs from the Buildkite API and execute them.

Apart from the obvious authentication components that are required to access the API, the agent provides us with:
- An agent-level hooks system
- The ability to completely self-manage our build environments and secrets

Many build systems provide a free tier of hosting. In the best of those cases, you provide them a Docker image that they then deploy. Your jobs run inside of that image. The mechanism with which secrets (envars and files) are passed to these systems vary wildly.

##### The Value of Self Hosted
We could probably make those systems work if need be. By self hosting, however, we completely control various facets of the build pipeline:
- Secrets
  - Where they live
  - How they're stored or downloaded
  - Their form (envar vs JSON file, etc.)
- Complete control of our dependencies, down to the OS/Kernel.
- The ability to invest in the one-time-cost (as opposed to the ongoing cost of cloud-provided hosting) of physical hardware , customized to our workload.
