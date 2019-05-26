Feature: Coach activates and deactivates lessons
   Coaches need to activate lessons in order for learners to gain access and start submitting them, and deactivate them afterwards

  Background:
    Given I am signed in to kolibri as coach user
      And I am on *Coach - '<class>' > Plan > Lessons* page
      And I see the lesson <lesson>

  Scenario: Coach changes the lesson status to *Active*
    Given that lesson <lesson> *Status* is *Inactive*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit lesson details for '<lesson>'* page
      When I select *Active* under *Status*
      And I click *Save changes* button
    Then the page closes
      # And I see the snackbar notification *Changes to lesson saved* # No notification?
      And I see the lesson *Status* is *Active*
    But if I click the *Cancel* button
    Then the page closes
      And I see the lesson <lesson> *Status* is still *Inactive*

  Scenario: Coach changes the lesson status to *Inactive*
    Given that lesson <lesson> *Status* is *Active*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit lesson details for '<lesson>'* page
      When I select *Inactive* under *Status*
      And I click *Save changes* button
    Then the page closes
      # And I see the snackbar notification *Changes to lesson saved* # No notification?
      And I see the lesson *Status* is *Inative*
    But if I click the *Cancel* button
    Then the page closes
      And I see the lesson <lesson> *Status* is still *Active*

Examples:
| lesson                |
| mathematics exercises |
