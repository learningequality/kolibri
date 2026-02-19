# Reviewing a Pull Request

## Preface

This is just one perspective on how to proceed reviewing a pull request (PR), in a technical sense, as an engineer on the team. The process below is specifically ordered by preference: try this, otherwise this, otherwise… so on.

## Process

A helpful practice in reviewing PRs is to ask yourself questions about what you're looking at. By raising questions for yourself, you have a goal to accomplish: answer that question. For instance, you may see a strange bit of code and some questions may come to mind. Use the PR to your advantage in answering any of those questions. This helps you validate you're understanding the PR, that the code is self-explanatory, and that it accomplishes the goal. If you've exhausted the resources available to you for answering any question (resources as in the PR's context, its description and details, and code itself), then you have a perfectly valid question to raise as feedback on the PR!

Here's an outline of how you might go about a PR review:

- 1. Determine the context for the change

    Get an idea of what the PR is trying to accomplish. You don't have to understand it all yet, but once you have some context, you can review the PR in that lens. This might include the issues or bugs its fixing, some discussion on Slack, and/or the milestone or branch that the PR is targeting. Here are some guidelines:

    - Review the issue(s) the PR is closing, if applicable
    - If you're still unsure, review the PR description or details
    - If you still don't understand the context, ask a question
- 2. Start reviewing the code

    You won't have a complete picture of how the PR's code changes work to accomplish the goal within its context until you give a preliminary review of the code. First, review the code in a technical sense looking out for obvious errors or issues, including any linting issues or committed debugging code. For the full set of code quality principles the team follows, see [Code Quality](../code_quality.rst). While looking at individual units of code, these questions may come to mind:

    - Does any code look buggy?
        - Does it have sufficient defensive logic against edge cases?
    - Could the code be simplified while still achieving its purpose?
    - Are there any worthwhile optimizations?
    - Does the code fit within the pattern that we expect?
        - Are there any common conventions the team or codebase has that apply?
    - Could the code be made more readable, not necessarily with comments?
    - Does the code have sufficient code comments?
    - Does the code depart from any familiar structure unnecessarily?
    - Are unit tests actually achieving accurate coverage of the code its testing?
        - For instance, do the tests hack something in order to test it?
    - Can anything be consolidated or should anything be refactored?
        - Don't Repeat Yourself (DRY)
        - Single Responsibility Principle (SRP)
    - Alternatively, is there any premature abstraction?
        - Rule of Three (https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming))
    - Are any thoughts you have just opinions or is it worthwhile change?
        - Should your feedback be a blocker?

    Once you've completed once over of the code, you can start to dig deeper. Iterating over it, asking more questions and answering them is key.

- 3. How complete is the PR

    With a once over of the PR's code complete, you can start digging deeper. If further changes are required, you may postpone this until those are completed. Otherwise, you can now start tracing the usage and interactions of code its adding or modifying.

    - Does the code have any dependencies, like libraries or packages, that are missing?
        - Does it use features that are missing in the included version?
    - Was something refactored, but not all usages also refactored?
        - For example, a function's arguments were changed, and perhaps one usage of the function was updated, but there exist other usages.
    - Does the code add any tech debt?
        - Could the debt be eliminated?
        - Is the debt tracked in an issue?
    - Are any interconnects between the code properly handled?
        - Do API calls pass the correct information?
        - Do API calls use the appropriate formatting?
        - Should code use any existing caching?
    - Does it only make sense within a larger featureset or implementation?
        - Will it break development for others if it's merged?
        - Should it be merged to a feature branch?
    - Does the code have any consequences?
        - It a feature breaking change?
        - Does that breaking change fit within the context?
    - Is it missing things like strings, internationalization fixes, or accessibility integrations?
        - `aria-*` attributes?
        - LTR *and* RTL language support?
    - What are the security considerations?
        - Do API calls have the appropriate authentication permissions?
        - Could submitted data be mishandled and cause issues?
        - Does the code bypass any known security practices? e.g. prepared SQL statements
- 4. Manual testing

    So you've reviewed the code and you feel like you understand it. You can see how the PR achieves its goal through the code changes. Now you're left with whether it actually does achieve it, which can be determined through manual testing.

    - Does something go wrong when you try to test it?
        - Missing dependencies?
    - Are there any cosmetic issues?
        - Does it follow KDS guidelines?
        - Is spacing or alignment consistent?
        - Is anything overflowing where / when it shouldn't?
        - How does it respond to different screen sizes?
        - How does it respond to different use cases? i.e. within the Android app
        - Does it break with certain wildcard conditions? i.e different content kinds, or learning activities
    - Can you break it?
        - Any edge cases come to mind?
        - Any odd or unexpected pathways?
        - Anything problematic in the developer tools console or logs?
    - Does it work as intended?
        - Does it fix the issue(s) it closes?
        - Does preliminary review of the accessibility features function as expected?
    - Does the QA team approve?
        - Mention them on the PR, if applicable, so they can do more thorough testing
