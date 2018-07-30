Feature: Coach create at least 2 groups
    Coach needs to be able create groups

  Background:
    Given I am signed in to Kolibri as a coach user
    Given I am in *Coach > Groups* page
    Given there are learners in the selected class

  Scenario: Create first group
    When I click on *New group* button
    Then I see *Add new group* modal
    When I enter a group name <group>
    When I click *Save* button
    Then I see new group
    Then the modal disappears
    Then I see the new group is added

  Scenario: Create second group
    Given first group is created
    When I click on *New group* button
    Then I see *Add new group* modal
    When I enter a group name <group>
    When I click *Save* button
    Then I see new group
    Then the modal disappears
    Then I see the new group is added

Examples:
| group   |
| Team A  |
| Team B  |