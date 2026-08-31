Feature: Super admin manages import network locations
  Super admin needs to be able to add and remove a network location from which they can import content

  Background:
    Given I am signed in to Kolibri as a super admin user, or a user with device permissions to import content
      And I am on the *Select device* modal
      And I see *There are no devices yet*
      And the *Continue* button is disabled

  Scenario: Super admin can add a new device
    When I click the *Add new address* link
    Then I see the *New device* modal
    When I enter a valid network address in the *Full network address* field
      And I enter the network name in the *Network name* field
      And I press the *Add* button
    Then I see a Successfully added device* snackbar message
      And I see a radio button with the device name as the label and the  network address as the description

  Scenario: Super admin can remove a device
    Given I have already added a device
    	And I am on the *Select device* modal
    When I click the *Remove* link next to the radio button
    Then the radio button for the device disappears from the list
      And I see a snackbar alert saying *Successfully removed device*

  Scenario: A saved device is available to import from
    Given I have already added a device
      And the device is available in the network
    Then I see that the radio button for the device is enabled
    	And the *Continue* button is enabled

  Scenario: A saved device is not available to import from
    Given I have already added a device
      And the device is not available in the network
    Then I see that the radio button for the device is disabled
    	And the *Continue* button is disabled

  Scenario: Attempting to add an address with an invalid URL
    Given I am on the *New device* modal
    When I enter and invalid network address in the *Full network address* field
      And I enter a name in the *Network name* field
      And I press the *Add* button
    Then I see a *Could not connect to this device* error under the *Full network address* field

  Scenario: Attempting to add an address without a running Kolibri instance
    Given I am on the *New device* modal
      And there isn't a running Kolibri instance in the network
    When I enter the network address in the *Full network address* field
      And I enter a name in the *Network name* field
      And I press the *Add* button
    Then I see *Could not connect to this network address* error under the *Full network address* field
