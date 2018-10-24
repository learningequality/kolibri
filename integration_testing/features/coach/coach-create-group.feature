Feature: Coach create groups
  Coach needs to be able create groups to support different learning needs and speeds

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am in *Coach > Groups* page
      And there are learners in the selected class

  Scenario: Create group
    When I click on *New group* button
    Then I see *Create new group* modal
    When I enter a group name <group>
      And I click *Save* button
    Then the modal closes
      And I see the new group on *Class groups* page


Examples:
| group   |
| Team A  |
| Team B  |
