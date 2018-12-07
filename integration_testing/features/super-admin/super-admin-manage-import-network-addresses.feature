Feature: Super admin manage import network locations
  Super admin needs to be able to add and remove a network location from which they can import content

  Background:
    Given I am signed in to Kolibri as an admin user
      And I am on the *Device > Channels* page

  Scenario: Access the Select Network Address modal
    When I click on *Import*
      And I select the *Local network or internet* radio button
      And I click the *Continue* button
    Then I see the *Select network address* modal

  Scenario: No addresses have been saved
    Given I have not saved any addresses
      And I am on the *Select network address* modal
    Then I see an alert *You have not entered any addresses*
      And The *Continue* button is disabled

  Scenario: Adding an address
    Given I am on the *Select network address* modal
    When I click the *New address* button
    Then I see the *New address* modal
    When I enter <network_address> in the *Full network address* field
      And I enter <network_name> in the *Network name* field
      And I press the *Add* button
    Then the *New address* modal disappears
      And I see the *Select network address*
      And I see a snackbar alert *Successfully added address*
      And I see a radio button with <network_name> as the label
      And That radio button has <network_address> as the description

  Scenario: Removing an address
    Given I am on the *Select network address* modal
      And I have saved a network location for <network_name>
    When I click the *Forget* button next to the radio button for <network_name>
    Then The radio button for <network_name> disappears from the list
      And I see a snackbar alert saying *Successfully removed address*

  Scenario: A saved address is available to import from
    Given I am on the *Select network address* modal
      And I have saved a network location for <network_name>
      And <network_name> is available
    Then the radio button for <network_name> is enabled

  Scenario: A saved address is not available to import from
    Given I am on the *Select network address* modal
      And I have saved a network location for <network_name>
      And <network_name> is not available
    Then the radio button for <network_name> is disabled

  Scenario: Attempting to add an address with an invalid URL
    Given I am on the *New address* modal
      And <network_name> does not have a valid URL
    When I enter <network_address> in the *Full network address* field
      And I enter <network_name> in the *Network name* field
      And I press the *Add* button
    Then I see *Please enter a valid IP address, URL, or hostname* error under the *Full network address* field

  Scenario: Attempting to add an address without a running Kolibri instance
    Given I am on the *New address* modal
      And <network_name> does not have a running Kolibri instance
    When I enter <network_address> in the *Full network address* field
      And I enter <network_name> in the *Network name* field
      And I press the *Add* button
    Then I see *Could not connect to this network address* error under the *Full network address* field

Examples:
| network_address  | network_name       | is_available | url_valid | has_kolibri |
| 126.1.1.5:8000   | Main Server        | true         | true      | true        |
| 126.1.1.6:8000   | Unavailable Server | false        | true      | true        |
| !!!.&&&.???      | Invalid Server     | false        | false     | false       |
| doesnotexist.tor | Unreachable server | false        | true      | false       |
