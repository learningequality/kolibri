Feature: Super admin runs benchmark manage command
    Super admin needs to be able to produce a benchmark report for the device where Kolibri is running

  Background:
    Given that the Kolibri server is running
      And I have opened a Terminal window in my operative system

  Scenario: Execute the benchmark command
    When I run the 'kolibri manage benchmark' command in the Terminal
			And I wait for the command prompt to appear again
    Then I see a complete report with performance and benchmark information
