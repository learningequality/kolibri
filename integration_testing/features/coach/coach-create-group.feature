Feature: Coach creates groups
  Coach needs to be able create groups to support different learning needs and speeds

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am in *Coach > Plan > Groups* page
      And there are learners in the selected class

  Scenario: Create group
    When I click on *New group* button
    Then I see *Create new group* modal
    When I enter a group name <group>
      And I click *Save* button
    Then the modal closes
      And I see the new group on *Class groups* page

  Scenario: Group name does not pass validation
    Given that I have entered characters over the character limit
    # This seems to be blocked, not possible to go over the limit
      Or I entered an improper character such as a symbol
      # This is not implemented
      Or I left the name field empty
      # This seems the only error that triggers the red highlight
    Then I see the text field highlighted in red
      And I see error text saying *This field is required*

Examples:
| group   |
| Team A  |
| Team B  |
