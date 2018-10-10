Feature: Super admin removes all device permissions from another super admin

  Background:
    Given I am signed in to Kolibri as a super admin
      And I am on the *Device > Permissions* page
      And I have clicked *Edit Permissions* on another super admin

  Scenario: Super admin can see what will happen if they want to remove super admin permissions
    When I deselect the *Make super admin* checkbox
    Then I see that checkboxes under *Device permissions* also become unchecked
      And I see that those checkboxes under *Device permissions* also become active
      And I see the *Save changes* button becomes active
    When I click *Save changes*
    Then I remain on this page
      And I see a confirmation snackbar appear
      And I see that *User type* changes to their previous facility role
      And I see that all checkboxes are unchecked
      And I see that *Save changes* button becomes disabled
