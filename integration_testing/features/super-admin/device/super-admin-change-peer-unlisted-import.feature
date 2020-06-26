Feature: Super admin changes device setting allowing unlisted channel peer import
  Super admin needs to be able to change the setting to allow other network computers to import the device's unlisted channels

# For these scenarios you will need another Kolibri running on a discoverable device in the same LAN

  Background:
    Given I am signed in to Kolibri <instance1> as a super admin user
      And I am signed in to Kolibri <instance2> as a super admin user
      And the public channel <public_channel> has been imported into <instance1>
      And the unlisted channel <unlisted_channel> has been imported into <instance1> from using a token

  Scenario: Another Kolibri instance is unable to import my unlisted channels
    Given the *Allow other computers on this network to import my unlisted channels* checkbox is unchecked on *Device > Settings* page of <instance1>
      And I am on *Device > Channels* page of <instance2>
    When I click *Import*
    Then I see *Select a source* modal
    When I select *Local network or internet* and click *Continue*
    Then I see *Select network address* modal
      And I see <instance1> and its IP address <network_address1>
    When I select <instance1>
      And I click *Continue*
    Then I see *Select resources for import*
      And I see the public channel <public_channel>
      And I do not see the unlisted channel <unlisted_channel>

  Scenario: Change the setting to allow the import my unlisted channels
    Given the *Allow other computers on this network to import my unlisted channels* checkbox is unchecked on *Device > Settings* page of <instance1>
    When I click *Allow other computers on this network to import my unlisted channels*
    Then *Allow other computers on this network to import my unlisted channels* becomes checked
    When I click *Save*
    Then I see *Settings have been updated*

  Scenario: Another Kolibri instance is able to import my unlisted channels
    Given the *Allow other computers on this network to import my unlisted channels* checkbox is checked on *Device > Settings* page of <instance1>
      And I am on *Device > Channels* page of <instance2>
    When I click *Import*
    Then I see *Select a source* modal
    When I select *Local network or internet* and click *Continue*
    Then I see *Select network address* modal
      And I see <instance1> and its IP address <network_address1>
    When I select <instance1>
      And click *Continue*
    Then I see *Select resources for import*
      And I see the public channel <public_channel>
      And I see the unlisted channel <unlisted_channel>

Examples:
| instance1 | instance2 | network_address1 | network_address2 | public_channel | unlisted_channel    |
| Kolibri A | Kolibri B | 192.168.0.5      | 192.168.0.6      | MIT Blossoms   | My Private Channel |
