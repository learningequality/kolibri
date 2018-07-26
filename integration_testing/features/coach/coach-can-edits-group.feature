Feature: Edit a group’s name
    In order to see the edit group is functioning
    Coach can rename the group's

  Background:
    Given That I am signed in to kolibri as coach user
    Given that there are groups created
    Given I am in the *Coach > Groups* page

  Scenario: Edit the created group name
    When I click on *Options*
    Then *Rename group* and *Delete group* options appear
    When I click on Rename group
    Then Rename group modal appears
    When I change group name
    When I click on Save
    Then modal disappears
    Then the group name is changed
    Then I can see the new group name
