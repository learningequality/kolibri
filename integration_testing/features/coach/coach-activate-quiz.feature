Feature: Coach activates and deactivates quizzes
  Coaches need to activate quizzes for learners to gain access and start submitting them

  Background:
    Given I am signed in to Kolibri as coach user
      And I am on *Coach - '<class>' > Plan > Quizzes > '<quiz>'* page

  Scenario: Change the quiz status to *Active*
    Given that quiz <quiz> *Status* is *Inactive*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details for '<quiz>'* page
      When I select *Active* under *Status*
        And I click *Save changes* button
      Then the page reloads
#        And I see the snackbar notification *Changes to quiz saved* # No snackbar
        And I see the quiz *Status* is *Active*

  Scenario: Change the quiz status to *Inactive*
    Given that quiz <quiz> *Status* is *Active*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details for '<quiz>'* page
      When I select *Inactive* under *Status*
        And I click *Save changes* button
      Then the modal closes
#        And I see the snackbar notification *Changes to quiz saved* # No snackbar
        And I see the quiz *Status* is *Inactive*

Examples:
| quiz          |
| First quarter |
