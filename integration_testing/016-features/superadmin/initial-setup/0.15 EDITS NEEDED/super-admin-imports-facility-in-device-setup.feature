Feature: Super admin imports facility in device setup
  Super admin can import an existing facility from the local network

  Background:
    Given that the Kolibri installation was successful
      And the server is running for the first time
      And the browser is opened at the IP address 127.0.0.1:8080
      And there is another auto-discoverable device in the local network that is running a server with a Kolibri facility
      And I have selected a language in the device setup
      And I have selected *Advanced setup*
      And I have entered a *Device name*

  Scenario: View a list of devices in my network
    Given I see *Select a facility setup for this device*
    When I select *Import all data from an existing facility*
    	And I click *Continue*
    Then I see *Select network address*
      And I see a list of devices in my network

  Scenario: Import facility from a device with multiple facilities
    Given I am at *Select network address* modal
      And I select a device
      And that device has more than one facility loaded
    When I click *Continue*
    Then I see *Import facility - 1 of 4*
    	And I see *Select facility*
      And I see the name of the device from which I am importing
      And I see the network address of that device
      And I see a list of facilities on that device
    When I select a facility
    Then I see *Enter the username and password for a facility admin of <facility> or a super admin of <device>
    When I enter the username and password of a facility admin or super admin
      And I click *Continue*
    Then I see *Import facility - 2 of 4*
    	And I see *Loading '<facility>'*
      And I see loading status bar
    When the facility has finished loading
    Then I see the status *Finished*
      And I see a green check icon
      And I see *'<facility>' successfully loaded to this device*
    When I click *Continue*
    Then I see *Import facility - 3 of 4*

  Scenario: Import facility from a device with only one facility
    Given I am on *Select network address* modal
      And I select a device
      And that device has only one facility loaded
    When I click *Continue*
    Then I see *Import facility - 1 of 4*
      And I see *Import facility*
      And I see the name of the device from which I am importing
      And I see the network address of that device
      And I see *Enter the username and password for a facility admin or a super admin of '<device>'*
    When I enter the username and password of a facility admin or super admin
      And I click *Continue*
    Then I see *Import facility - 2 of 4*
    	And I see *Loading '<facility>'*
      And I see loading status bar
    When the facility has finished loading
    Then I see the status *Finished*
      And I see a green check icon
      And I see *'<facility>' successfully loaded to this device*
    When I click *Continue*
    Then I see *Import facility - 3 of 4*

    Scenario: Import facility from a 0.14.x device with multiple facilities to a 0.15.x device
    Given I am at *Select network address* modal
      And I select a device
      And that device has more than one facility loaded
    When I click *Continue*
    Then I see *Import facility - 1 of 4*
    	And I see *Select facility*
      And I see the name of the device from which I am importing
      And I see the network address of that device
      And I see a list of facilities on that device
    When I select a facility
    Then I see *Enter the username and password for a facility admin of <facility> or a super admin of <device>
    When I enter the username and password of a facility admin or super admin
      And I click *Continue*
    Then I see *Import facility - 2 of 4*
    	And I see *Loading '<facility>'*
      And I see loading status bar
    When the facility has finished loading
    Then I see the status *Finished*
      And I see a green check icon
      And I see *'<facility>' successfully loaded to this device*
    When I click *Continue*
    Then I see *Import facility - 3 of 4*

  Scenario: Import facility from a a 0.14.x device with only one facility
    Given I am on *Select network address* modal
      And I select a device
      And that device has only one facility loaded
    When I click *Continue*
    Then I see *Import facility - 1 of 4*
      And I see *Import facility*
      And I see the name of the device from which I am importing
      And I see the network address of that device
      And I see *Enter the username and password for a facility admin or a super admin of '<device>'*
    When I enter the username and password of a facility admin or super admin
      And I click *Continue*
    Then I see *Import facility - 2 of 4*
    	And I see *Loading '<facility>'*
      And I see loading status bar
    When the facility has finished loading
    Then I see the status *Finished*
      And I see a green check icon
      And I see *'<facility>' successfully loaded to this device*
    When I click *Continue*
    Then I see *Import facility - 3 of 4*

  Scenario: Import facility by manually adding the URL address of an existing Kolibri instance
    Given I am on *Select network address* modal
    When I click *Add new address*
    Then I see the *New address* modal
    When I enter the URL address of an existing Kolibri instance in the *Full network address* field
    	And I enter a name for this address in the *Name* field
    	And I click *Add*
    Then I am back at the *Select network address* modal
    	And I see that the added network address is selected
    When I click *Continue*
    Then I see *Import facility - 1 of 4*
      And I see *Import facility*
      And I see the name of the device from which I am importing
      And I see the network address of that device
      And I see *Enter the username and password for a facility admin or a super admin of '<device>'*
    When I enter the username and password of a facility admin or super admin
      And I click *Continue*
    Then I see *Import facility - 2 of 4*
    	And I see *Loading '<facility>'*
      And I see loading status bar
    When the facility has finished loading
    Then I see the status *Finished*
      And I see a green check icon
      And I see *'<facility>' successfully loaded to this device*
    When I click *Continue*
    Then I see *Import facility - 3 of 4*

  # to test this you will have to stop or disconnect the peer device
  Scenario: Loading facility fails and user starts over
    Given I am on *Import facility - 2 of 4* step
      And I see *Loading '<facility>'*
      And I see loading status messages
      And I see an indeterminate loading spinner
      And I don't see a back arrow in the app bar
    When something happens which causes the load to fail
    Then I see *<X> of 7: Failed*
      And I see *Could not load '<facility>' to this device*
      And I see *Retry* button
      And I see *Start over* button
    When I click *Retry*
      Then I see loading messages for the facility
    When it fails again
      And I click *Start over*
    Then I see *Please select the default language for Kolibri*

  # to test this you will have to stop or disconnect the peer device
  Scenario: Loading facility fails
    Given I am on *Import facility - 2 of 4*
      And I see *Loading '<facility>'*
      And I see loading status messages
      And I see an indeterminate loading spinner
      And I don't see a back arrow in the app bar
      And I wish to cancel the facility load
    When I click *Cancel*
    Then I see *Cancelled*
      And I see *Could not load '<facility>' to this device*
      And I see *Retry* button
      And I see *Start over* button

  Scenario: Set super admin account to default admin
    Given I am on *Import facility - 3 of 4*
      And I see *Select super admin account*
      And I see a dropdown for super admin
      And I see the username of the admin that I used to load the facility
    When I click *Continue*
    Then I see *Import facility - 4 of 4*

  Scenario: Set super admin account to a different admin
    Given I am on *Import facility - 3 of 4*
      And I see *Set super admin account*
      And I see a dropdown for super admin
      And I see the username of the admin that I used to load the facility
    When I click the super admin dropdown
    Then I see a list of facility admins of the facility I loaded
      And I see a list of super admins of the device I loaded from
    When I select a different admin
    Then I see the selected admin in the closed dropdown
    When I click *Continue*
    Then I see *Import facility - 4 of 4*

  Scenario: Set super admin account to create new admin
    Given I am on *Import facility - 3 of 4*
      And I see *Set super admin account*
      And I see a dropdown for super admin
      And I see the username of the admin that I used to load the facility
    When I click the super admin dropdown
    Then I see a list of facility admins of the facility I loaded
      And I see a list of super admins of the device I loaded from
    When I select *Create new super admin*
    Then I see *This account will be associated with '<facility>'*
      And I see form fields for *Full name*, *Username*, *Password*, and *Re-enter password*
    When I fill in all form fields
      And I click *Continue*
    Then I see *Import facility - 4 of 4*

  Scenario: Responsibilities as an administrator
    Given I am on *Import facility - 4 of 4*
      And I see *Responsibilities as an administrator*
    When I click *Usage and privacy*
    Then I see *Usage and privacy* modal
    When I click *Close*
    Then I see *Responsibilities as an administrator
    When I click *Finish*
    Then I see *Welcome to Kolibri*

  Scenario: Streamlined content import after importing facility
    Given I have successfully imported a facility during device setup
      And I see *Welcome to Kolibri*
      And I see a message that I should import channels to the device
      And I see a message that reports will not display properly without resources
    When I click *Continue*
    Then I see *Select a source*
      And I see the device that I imported from auto-selected
      And I see *Choose another source*
    When I click *Continue*
    # In case the peer device has only the unlisted channels, make sure  that the device setting to allow peers to see them is checked
    Then I see *Select channels for import*
      And I see that all channels are selected by default
    When I click *Import*
    Then I see the import task in the task manager

  Examples:
  | username | password | device   | facility   |
  | admin    | admin    | MyDevice | MyFacility |
