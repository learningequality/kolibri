Feature: Coach edits lessons
  Coach needs to be able to edit existing lesson title and description, and to reassign lessons to group(s) or entire class

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach - '<class>' > Plan > Lessons* page
      And there are 2 or more learner groups
      And there is a lesson <lesson> created previously
      And I am on the *Edit Details* dialog for <lesson> (arriving there from either *Reports* or *Plan* page)

  Scenario: Edit existing lesson title
    When I edit the lesson <lesson> *Title* and leave the field
      And I click the *Save changes* button
    Then I am returned to either the report or plan page for <lesson> (depending from where I arrived)
      And I see the title change under the *Title* header
      # And I see the snackbar notification “Lesson changes saved” # No snackbar

  Scenario: Cannot change the title of an existing lesson if it is already used
    Given There exists a lesson called "Second Lesson"
      When I enter "Second Lesson" in the *Title* field
        And I either move to a different field or click *Save Changes*
      Then the *A lesson with this name already exists* error notification appears
        And I cannot save until I choose another title

  Scenario: Edit existing lesson description
    When I edit the lesson <lesson> *Description*
      And I click the *Save Changes* button
    Then I am returned to either the report or plan page for <lesson> (depending from where I arrived)
      And I see the description change under the *Description* header
      # And I see the snackbar notification “Lesson changes saved” # No snackbar

  Scenario: Edit existing lesson status
    When I change the lesson status from *Inactive* to *Active* (or vice-versa)
      And I click the *Save changes* button
    Then I am returned to either the report or plan page for <lesson> (depending from where I arrived)
      And I see the status change next to the *Status* header
      # And I see the snackbar notification “Lesson changes saved” # No snackbar

  Scenario: Reassign existing lesson to different recipient groups
    When I change *Recipients* by selecting *Entire class* or one of the groups
      And I click the *Save changes* button
    Then I am returned to either the report or plan page for <lesson> (depending from where I arrived)
      And the *Recipients* field reflects the changes I made

  Scenario: Preview lesson resource
    Given <lesson> has at least one resource
      When I click on the link for lesson resource title
      Then I see the resource in a full screen page

Examples:
| lesson        |
| First lesson  |
