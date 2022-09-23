Feature: Change device name
  A super admin needs to be able to change the user-configurable name of their device to aid in discoverability for peer syncing

  Background:
    Given I am signed in as a super admin
      And I have never changed the device name before

  Scenario: The default device name is same as the system device name
    # If upgrading from a pre-0.14 device, device name might not exist
    When I go to *Device > Info* page
    Then the value in the *Device name* field is the same as the host name

  Scenario: Change device name
    When I click *Edit* next to the device name
    Then I see the *Device name* modal
    When I enter a new name
    When I click *Save*
    Then I see the new device name
      And I see a snackbar that says *Changes saved*
