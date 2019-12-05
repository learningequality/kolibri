Feature: Coach creates groups
  Coach needs to be able create groups to support different learning needs and speeds

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am in *Coach - '<class>' > Plan > Groups* page
      And there are learners in the selected class

  Scenario: Create group
    When I click on *New group* button
    Then I see *Create new group* modal
    When I enter a group name <group>
      And I click *Save* button
    Then the modal closes
      And I see the snackbar notification *Created*
      And I see the new group <group> in *Groups* tab

  Scenario: Check validation for the name field
    When I try to enter a name with more than 50 characters
    Then I see that the name is cut at 50
    When I input a group name same as for an already existing group
    Then I see the error notification *A group with that name already exists* 
    When I leave the name field empty
      And I click *Save*
    Then I see the error notification *This field is required*

Examples:
| group   |
| Team A  |
| Team B  |
