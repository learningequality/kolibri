Feature: Super admin gives super admin permissions to a facility user
  A super admin should understand the implications of what it means to
make a facility user a super admin

  Background:
    Given I am signed in to Kolibri as a super admin
      And I am on the *Device > Permissions* page
      And I have clicked *Edit Permissions* on a facility user who does
  not have device permissions

  Scenario: Super admin can see what will happen if they make a user a super admin
  When I click on the *Make super admin* checkbox
  Then I see that the checkboxes under *Device permissions* become checked
    And I see that checkboxes under *Device permissions* also become disabled
    And the *Save changes* button becomes active
  When I click *Save changes*
  Then I remain on this page
    And I see a confirmation snackbar appear
    And I see that *User type* changes to *Super admin*
    And I see that the *Make super admin* checkbox is still checked
    And I see that *Save changes* button becomes disabled
