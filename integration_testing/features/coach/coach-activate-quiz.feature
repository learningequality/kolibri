Feature: Coach activates and deactivates quizzes
  Coaches need to activate quizzes for learners to gain access and start submitting them

  Background:
    Given I am signed in to Kolibri as coach user

  Scenario: Change the quiz status to *Open*
    Given that quiz <quiz> has never been set to the status *Open*
      When I am on *Coach - '<class>' > Plan > Quizzes > '<quiz>'* page
      Then I see the *Open Quiz* button on the left sidebar
      When I click *Open Quiz* in the left sidebar
      Then I see a modal asking me to confirm the change
      When I click *Continue* in that modal
      Then that modal window disappears
        And the button changes to *Close Quiz*
        And *Opened x seconds ago* appears beneath the button
        And I see a snackbar notification saying *Quiz Opened*
      When I click *Cancel* in that modal
        Then that modal window disappears
          And the status does not change
          And the *Open Quiz* button remains in place

  Scenario: Change the quiz status to *Closed*
    Given that quiz <quiz> *Status* is *Open*
      When I am on *Coach - '<class>' > Plan > Quizzes > '<quiz>'* page
      When I click *Close Quiz* in the left sidebar
      Then I see a modal asking me to confirm the change
      When I click *Continue* in that modal
        Then that modal window disappears
        And the button changes to text saying *Quiz Closed*
        And I see a snackbar notification saying *Quiz Closed*
        And *x seconds ago* appears beneath it
        And a section *Report visible to learners* appears with a switch set to the *Yes* value
      When I click *Cancel* in that modal
        Then that modal window disappears
          And the status does not change
          And the *Close Quiz* button remains in place

    Scenario: Toggle quiz report visibility
      Given that quiz <quiz> has *Report visible to learners* is set to the *Yes* value
        When I click the switch and toggle it away from the *Yes* value
        Then I see a snackbar notification saying *Quiz report is not visible to learners*
      Given that quiz <quiz> has *Report visible to learners* is not set to the *Yes* value
        When I click the switch and toggle to the *Yes* value
        Then I see a snackbar notification saying *Quiz report is visible to learners*

Examples:
| quiz          |
| First quarter |
