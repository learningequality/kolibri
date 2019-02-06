Feature: Coach edits lessons
  Coach needs to be able to edit existing lesson

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach > Plan > Lessons* page

  Scenario: Edit existing lesson title
    Given there is a lesson <lesson> created previously
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit lesson details* modal
        And the title field should be in-focused by default
      When I edit the lesson title and leave the field
        And I click *Save* button
      Then the modal closes
        And I see the title change under the *Lesson* tab
        And I see the snackbar notification “Lesson changes saved”

  Scenario: Edit existing lesson description
    Given there is a lesson <lesson> created previously
      When I click the *Options* button
        And I select *Edit details*
      Then I see the *Edit lesson details* modal
      When I edit the lesson description
        And I click *Save* button
      Then the modal closes
        And I see the description change under the *Lesson* tab
        And I see the snackbar notification “Lesson changes saved”

Examples:
| title         | description  |
| First lesson  | Fractions 1  |
