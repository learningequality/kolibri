# START testing this scenario with a FRESH DB (make a copy of the current if you want to reuse it later), and make sure to have a stable connection available.

Background:
  Given I am signed into Kolibri as a <superuser> or <device admin>
    And I am in the device tab
    And I press the 'import' button, select 'local network or internet'


Feature: Successful auto-discovery of new address
  Admin's device is able to automatically discover and connect to nearby Kolibri peers

  Scenario: Connecting to a Kolibri peer with content
     Given that there are Kolibri peers around me
      And the peers each have content available
  	 When I open the 'select network address' modal and wait a few seconds
  	 Then I should see a loading spinner accompanied with the word 'searching...'
  	   And I should see a list of found local Kolibri peers below all the manually entered network addresses
       And each peer should display their IP address, port and peer ID
