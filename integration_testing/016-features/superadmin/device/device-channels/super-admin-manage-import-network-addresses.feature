Feature: Super admin manages import network locations
  Super admin needs to be able to add and remove a network location from which they can import content

  Background:
    Given I am signed in to Kolibri as a super admin user, or a user with device permissions to import content
      And I am on the *Select network address* modal
      And I see *There are no addresses yet*
      And the *Continue* button is disabled

  Scenario: Adding an address
    When I click the *Add new address* link
    Then I see the *New address* modal
    When I enter <network_address> in the *Full network address* field
      And I enter <network_name> in the *Network name* field
      And I press the *Add* button
    Then the *New address* modal disappears
      And I see the *Select network address*
      And I see a snackbar alert *Successfully added address*
      And I see a radio button with <network_name> as the label
      And the radio button has <network_address> as the description

  Scenario: Removing an address
    Given I have saved a network location for <network_name>
    When I click the *Forget* link next to the radio button for <network_name>
    Then the radio button for <network_name> disappears from the list
      And I see a snackbar alert saying *Successfully removed address*

  Scenario: A saved address is available to import from
    Given I have saved a network location for <network_name>
      And <network_name> is available
    Then the radio button for <network_name> is enabled

  Scenario: A saved address is not available to import from
    Given I have saved a network location for <network_name>
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
