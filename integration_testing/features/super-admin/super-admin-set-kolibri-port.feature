Feature: Super admin set the Kolibri server port
    Super admin needs to be able to set the Kolibri server port according to their needs

  Background:
    Given that the Kolibri server is not running
      And I have access to terminal or command prompt

  Scenario: Set the port using the options.ini file
    When I edit/create the "options.ini" file inside the "KOLIBRI_HOME" folder
      And I write "[Deployment]" on the first line
      And I write "HTTP_PORT="<port> on the next line
      And I save my changes
      And I run the `kolibri start` command in the terminal or command prompt
    Then I see that the Kolibri server is running on <port> port 

  Scenario: Set the port with the "KOLIBRI_HTTP_PORT" environment variable
    When I set the <port> using the "KOLIBRI_HTTP_PORT" environment variable
      And I run the `kolibri start` command in the terminal or command prompt
    Then I see that the Kolibri server is running on <port> port 

Examples:
| port |
| 9999 |
