# START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and make sure to have a stable connection available.

Background:
  Given I am signed into Kolibri as a <superuser> or <device admin>
    And I am in the device tab
    And I press the 'import' button, select 'local network or internet'


Feature: No peers automatically discovered
  Admin's device is able to find any nearby Kolibri peers

  Scenario: No peers automatically found
     Given that there are no Kolibri peers around me
      And I have no manually saved addresses
     When I open the 'select network address' modal and wait a few seconds
     Then I should see a loading spinner accompanied with the word 'Searching'
      And no addresses should show at available
