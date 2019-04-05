Feature: Coach edits lessons
  Coach needs to be able to edit existing lesson title and description, and to reassign lessons to group(s) or entire class

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach > Plan > Lessons* page
      And there are 2 or more learner groups

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

  Scenario: Reassign lesson
    When I click the lesson title <lesson>
    Then I see the <lesson> page
    When I click *Options* button
      And I select *Edit details*
    Then I see the *Edit lesson details* modal
    When I change *Visible to* by selecting *Entire class* or one of the groups
      And I click *Save* button
    Then the modal closes
      And the snackbar notification appears
      And I see the change under *Visible to*

Examples:
| title         | description  |
| First lesson  | Fractions 1  |
