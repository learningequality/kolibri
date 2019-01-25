Feature: Coach reassign lessons
  Coach needs to be able to reassign lessons to group(s) or entire class

  Background:
    Given there are 2 or more learner groups
      And I am signed in to Kolibri as a coach user
      And I am on the *Coach > Lessons* page
      And I see the lesson <lesson>

  Scenario: Reassign lesson
    When I click the lesson title <lesson>
    Then I see the <lesson> page
    When I click *Options* button
      And I select *Edit details*
    Then I see the *Edit lesson details* modal
    When I change *Visible to* by selecting *Entire class* or one of the groups
      And I click *Save* button
    Then the modal closes
      And I see the change under *Visible to*

Examples:
| lesson       |
| Mathematics  |
