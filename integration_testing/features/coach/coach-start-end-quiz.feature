Feature: Coach start and end quizzes according to their teaching needs
  Coaches need to start quizzes in order for learners to gain access and be able to submit after answering questions

  Background:
    Given I am signed in to Kolibri as coach user

  Scenario: Start quiz
    Given that there is a quiz <quiz> that has never been started
      When I am on *Coach - '<class>' > Plan > Quizzes > '<quiz>'* page
      Then I see the *Start quiz* button
      When I click the *Start quiz* button
      Then I see a modal asking me to confirm the change
      When I click *Continue* in that modal
      Then that modal window disappears
        And the button changes to *End quiz*
        And *Started x seconds ago* appears beneath the button
        And I see a snackbar notification saying *Quiz started*
      When I click *Cancel* in that modal
        Then that modal window disappears
          And the status does not change
          And the *Start quiz* button remains in place

  Scenario: End quiz
    Given that quiz <quiz> has been started
      When I am on *Coach - '<class>' > Plan > Quizzes > '<quiz>'* page
      Then I see the *End quiz* button
      When I click *End quiz*
      Then I see a modal asking me to confirm the change
      When I click *Continue* in that modal
        Then that modal window disappears
        And the button changes to text saying *Quiz ended*
        And I see a snackbar notification saying *Quiz ended*
        And *x seconds ago* appears beneath it
        And below the heading *Report visible to learners* I see a switch set to the ON value (green)
      When I click *Cancel* in that modal
        Then that modal window disappears
          And the status does not change
          And the *End quiz* button remains in place

    Scenario: Toggle quiz report visibility
      Given that quiz <quiz> has *Report visible to learners* set to the ON value (green)
        When I click the switch
        Then I see a snackbar notification saying *Quiz report is not visible to learners*
        When I click the switch again
        Then I see a snackbar notification saying *Quiz report is visible to learners*

Examples:
| quiz          |
| First quarter |
