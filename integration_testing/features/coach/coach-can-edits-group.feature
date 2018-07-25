Feature: Edit a group’s name
    Coach should be able to sign in to access Kolibri Coach tab
    Coach can edit a group's name

  Background:
    Given you are in coach groups page
    Given that there are groups created

  Scenario: Edit a group name
    When I click on OPTIONS for a group
    Then Rename Group and Delete Group modal appears
    When I click on Rename group
    Then Rename group modal appears
    When I change group name
    When I click on Save
    Then modal disappears
    Then the group name is changed
    Then I can see the new group name
