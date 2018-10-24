Feature: Super Admin benchmark manage command
    Super Admin needs to have a benchmark report of the server running Kolibri

  Background:
    Given that the Kolibri server is running
      And super admin has open a terminal in the Operative System

  Scenario: A terminal is open in the same machine where Kolibri is running
    Given that I have access to the kolibri command line
    When I enter <kolibri manage benchmark>
      And I wait for the command prompt to appear again
    Then I see a complete report with performance and benchmarking information, splited in sections.

