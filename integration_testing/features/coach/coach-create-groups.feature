Feature: Coach create at least 2 groups
    Coach should be able to sign in to access Kolibri Coach tab
    Coach should be able to access groups tab

  Background:
    Given you are in coach groups page
    Given there are learners in the selected class

  Scenario: Create first group
    When I click on New Group
    Then I see “Add new group” modal
    When I enter a group name
    When "save" is clicked
    Then I see new group
    Then group is added

  Scenario: Create second group
    Given first group is created
    When I click on New Group
    Then I see “Add new group” modal
    When I enter a group name
    When "save" is clicked
    Then I see new group
    Then group is added

