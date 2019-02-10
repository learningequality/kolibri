Feature: Coach needs to be able to rename groups

  Background:
    Given that there are groups created
      And I am signed in to Kolibri as coach user
      And I am in the *Coach > Plan > Groups* page

  Scenario: Edit the group name
    When I click *Options* button
      And I select *Rename* option
    Then *Rename group* modal appears
    When I change group name
      And I click *Save*
    Then the modal closes
     And I see the changed group name

  Scenario: Group name does not pass validation
    Given that I have entered characters over the character limit
    # This seems to be blocked, not possible to go over the limit
      Or I entered an improper character such as a symbol
      # This is not implemented
      Or I left the name field empty
      # This seems the only error that triggers the red highlight
    Then I see the text field highlighted in red
      And I see error text saying *This field is required*
