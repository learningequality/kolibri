Feature: Coach activates and deactivates lessons
   Coaches need to activate lessons in order for learners to gain access and start submitting them, and deactivate them afterwards

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach > Plan > Lessons* page
      And I see the lesson <lesson_title>

  Scenario: Coach changes the lesson status to *Active*
    Given that lesson <lesson_title> *Status* is *Inactive*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit lesson details for '<lesson_title>'* page
      When I select *Active* under *Status*
      And I click *Save changes* button
    Then the page closes
      And I see the snackbar notification *Changes to lesson saved*
      And I see the lesson *Status* is *Active*

  Scenario: Coach changes the lesson status to *Inactive*
    Given that lesson <lesson_title> *Status* is *Active*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit lesson details for '<lesson_title>'* page
      When I select *Inactive* under *Status*
      And I click *Save changes* button
    Then the page closes
      And I see the snackbar notification *Changes to lesson saved*
      And I see the lesson *Status* is *Inative*

Examples:
| lesson_title          |
| mathematics exercises |
