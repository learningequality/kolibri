# START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and make sure to have a stable connection available.

Background:
  Given I am signed into Kolibri as a <superuser> or <devie admin>
    And I am in the device tab
    And I press the 'import' button, select 'local network or internet'

Feature: Forgetting a manually added address
  Kolibri admins are able to remove manually added address from their Kolibri device

  Scenario: clicking 'forget' button
  	Given that I have a recently manually added network address
    When I press the 'forget' button to the right of an added network
  	Then that network should automatically disappear from the network list
