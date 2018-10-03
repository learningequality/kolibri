Feature: Super admin changes device permissions from super admin to device permissions

Background:
  Given I am signed in to Kolibri as a super admin
    And I am on the *Device > Permissions* page
    And I have clicked *Edit Permissions* on another super admin

  Scenario: Super admin can see what will happen if they change super admin permissions to content import permission
    Given I have deselected the *Make super admin* checkbox
      And I see that all checkboxes are deselected
      And I see that every other checkbox is capable of selection
      And I see that the *Save changes* button becomes active
    When I click on a checkbox under *Device permissions*
    Then I should see that I can still *Save changes*
    When I click *Save changes*
    Then I remain on this page
      And I see a confirmation snackbar appear
      And I see that *User type* changes to their previous facility role
      And I see that *Save changes* button becomes disabled
