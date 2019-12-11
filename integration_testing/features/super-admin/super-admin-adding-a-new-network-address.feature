# START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and make sure to have a stable connection available.

Background:
  Given I am signed into Kolibri as a <superuser> or <device admin>
    And I am in the device tab
    And I press the 'import' button, select 'local network or internet'

Feature: Adding a new network address
  Device admins are able to manually add a new network address to connect to

  Scenario: Clicking on 'add new address' link
    When I click on the 'add new address' link
    Then a modal form should appear prompting me to input and name a network address
      And I should see a 'add' button which will confirm the network addition
    When All my fields contain no error and I click 'add'
    Then I should be navigated back to the 'select network address' modal and see my added network.
