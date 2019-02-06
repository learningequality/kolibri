Feature: Coach edits quizzes
  Coach needs to be able to edit existing quizzes

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach > Plan > Quizzes* page

  Scenario: Edit existing quiz title
    Given there is a quiz <quiz> created previously
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details* modal
        And the title field should be focused by default
      When I edit the quiz title and leave the field
        And I click *Save* button
      Then the modal closes
        And I see the title change under the *quiz* tab
        And I see the snackbar notification *Changes to quiz saved*

  Scenario: Change the quiz status to *Active*
    Given that quiz <quiz> *Status* is *Inactive*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details* modal
      When I select *Active* under *Status*
      And I click *Save* button
    Then the modal closes
      And I see the snackbar notification *Changes to quiz saved*
      And I see the quiz *Status* is *Active*

  Scenario: Change the quiz status to *Inactive*
    Given that quiz <quiz> *Status* is *Active*
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit quiz details* modal
      When I select *Inactive* under *Status*
      And I click *Save* button
    Then the modal closes
      And I see the snackbar notification *Changes to quiz saved*
      And I see the quiz *Status* is *Inactive*

Examples:
| title         | description  |
| First quiz  | Fractions 1  |
