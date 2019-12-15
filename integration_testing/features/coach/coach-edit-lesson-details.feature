Feature: Coach edits lessons
  Coach needs to be able to edit existing lesson title and description, and to reassign lessons to group(s) or entire class

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach - '<class>' > Plan > Lessons > '<lesson>'* page
      And there are 2 or more learner groups
      And there is a lesson <lesson> created previously

  Scenario: Edit existing lesson title
  # Repeat the scenario from the *Coach - '<class>' > Report > Lessons > '<lesson>'* page
    When I click the *Options* dropdown menu
      And I select the *Edit details* option
    Then I see the *Edit lesson details* page
    When I edit the lesson *Title* and leave the field
      And I click the *Save changes* button
    Then I see the lesson <lesson> page again
      And I see the title of the lesson is changed
      # And I see the snackbar notification “Lesson changes saved” # No snackbar

  Scenario: Cannot change the title of an existing lesson if it is already used
  # Repeat the scenario from the *Coach - '<class>' > Report > Lessons > '<lesson>'* page
    Given There exists a lesson called "Second Lesson"
      When I enter "Second Lesson" in the *Title* field
        And I either move to a different field or click *Save changes*
      Then the *A lesson with this name already exists* error notification appears
        And I cannot save until I choose another title

  Scenario: Edit existing lesson description
  # Repeat the scenario from the *Coach - '<class>' > Report > Lessons > '<lesson>'* page
    When I edit the lesson <lesson> *Description*
      And I click the *Save changes* button
    Then I see the lesson <lesson> page again
      And I see the title of the lesson is changed
      # And I see the snackbar notification “Lesson changes saved” # No snackbar

  Scenario: Reassign existing lesson to different recipient groups
  # Repeat the scenario from the *Coach - '<class>' > Report > Lessons > '<lesson>'* page
    When I change *Recipients* by selecting *Entire class* or one of the groups
      And I click the *Save changes* button
    Then I see the lesson <lesson> page again
      And the *Recipients* field reflects the changes I made

   Scenario: Assign individual learners
    When I change *Recipients* by selecting *Individual learners*
    Then I see a table listing all of the learners in the class.
    When I change *Recipients* by selecting both *Individual learners* and any other group that has learners
    Then I see the learners in the selected group(s) have the checkboxes by their names disabled
    When I select learners in the table by clicking the checkboxes next to their names
      And I click *Save changes*
    Then I can log in as one of the selected individual learners and view the lesson
    When I change *Recipients* by selecting *Entire class* then all groups and *Individual learners* become unchecked
      And I no longer see the table of learners

  Scenario: Preview lesson resource from *Plan > Lessons > '<lesson>'
    Given <lesson> has at least one resource
      When I click on the link for lesson resource title
      Then I see the resource in a full screen page

  Scenario: Preview lesson resource from *Report > Lessons > '<lesson>'
    Given <lesson> has at least one resource
      When I click on the link for lesson resource title in the *Report* tab
      Then I see the report for all the learners for that resource
      When I click the *Preview* button
      Then I see the resource in a full page

Examples:
| lesson        |
| First lesson  |
