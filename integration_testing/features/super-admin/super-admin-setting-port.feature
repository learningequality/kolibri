Feature: Super admin set the kolibri server port
    Super admin should be able to set the koliri server port into different ports

  Background:
    Given That I have or don't have an options.ini file with an alternate port set
      And I have or don't have the KOLIBRI_HTTP_PORT environment variable set

  Scenario: Setting the port with the options.ini file exist
    When I opened the options.ini file
      And I write and save the [Deployment] on the first line
      And I write and save the HTTP_PORT = <port> on the second line
      And I run the kolibri start command at the terminal or command prompt
    Then I see that the Kolibri server port is running on the <port>

  Scenario: Setting the port without the options.ini file
    When I create an options.ini file inside the KOLIBRI_HOME environment variable path
      And I opened the options.ini file
      And I write and save the [Deployment] on the first line
      And I write and save the HTTP_PORT = <port> on the second line
      And I run the kolibri start command at the terminal or command prompt
    Then I see that the Kolibri server port is running on the <port>

  Scenario: Setting the port using the KOLIBRI_HTTP_PORT environment variable
    When I set the <port>  at the KOLIBRI_HTTP_PORT environment variable
      And I run the Kolibri start command at the terminal or command prompt
    Then I see that the Kolibri server port is running on the <port>

Examples:
| 9999 | port |
