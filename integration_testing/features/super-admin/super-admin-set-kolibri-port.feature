Feature: Super admin set the kolibri server port
    Super admin should be able to set the koliri server port into different ports

  Background:
    Given that the Kolibri server is not running
      And I have an access to the terminal or command prompt

  Scenario: Setting the port with the options.ini file
    When I edit/create the "options.ini" file inside the "KOLIBRI_HOME" path
      And I write "[Deployment]" on the first line
      And I write "HTTP_PORT="<port> on the next line
      And I save my changes
      And I run the kolibri start command at the terminal or command prompt
    Then I see that the <port> is used by the Kolibri server

  Scenario: Setting the port with the KOLIBRI_HTTP_PORT environment variable
    When I set the <port>  at the KOLIBRI_HTTP_PORT environment variable
      And I run the Kolibri start command at the terminal or command prompt
    Then I see that the <port> is used by the Kolibri server

Examples:
| 9999 | port |
