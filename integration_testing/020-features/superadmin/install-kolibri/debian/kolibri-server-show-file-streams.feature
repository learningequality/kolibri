Feature: kolibri-server handles correctly content provided under file streams
  Some of the kolibri contents are not actual files but streams, they must be correctly handled
  Background:
    Given that the kolibri-server is installed and running
      And channel with token 'nakav-mafak' is installed

  Scenario: Interact with PLIX HTML5 app
    Given I am signed in to Kolibri
    When I open the PLIX HTML5 app in the browser
    Then I can view and interact correctly with the content
