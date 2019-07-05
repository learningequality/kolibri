Feature: Super admin kolibri command
    Super admin needs to be able to runs kolibri commands in the terminal

  Background:
    Given that I am on my operating system
      And I opened a Terminal window

  Scenario: Execute the kolibri help command
    When I run the 'kolibri --help' command in the Terminal
			And I wait for the command prompt to appear
    Then I see the details of Kolibri commands usage, option, examples, environment
            
  Scenario: Execute the kolibri start command
    When I run the 'kolibri start' command in the Terminal
			And I wait for the command prompt to appear
    Then I see the Kolibri is now running
      And I see the address link

  Scenario: Execute the Kolibri status command
    Given that Kolibri server is running
    When I run the 'kolibri status' command in the terminal
      And I wait for the command prompt to appear
    Then I see the Kolibri status is on

  Scenario: Execute the kolibri stop command
    Given that Kolibri server is running
    When I run the 'kolibri stop' command in the terminal
      And I wait for the command prompt to appear again
    Then I see the Kolibri is successfully stop

  Scenario: Execute the Kolibri version command
    When I run the 'kolibri --version' command in the terminal
      And I wait for the command prompt to appear
    Then I see the Kolibri version

  Scenario: Execute the Kolibri manage help command
    When I run the 'kolibri manage help' command in the terminal
      And I wait for the command prompt to appear
    Then I see the available subcommands

  Scenario: Execute the Kolibri shell command
    When I run the 'kolibri shell' command in the terminal
      And I wait for the command prompt to appear
    Then I write the 'import sys' press enter
      And write the 'sys.path' press enter
    Then I see the all the system path

  Scenario: Execute the Kolibri manage create super user command
    When I run the 'kolibri manage createsuperuser' command in the terminal
      And I wait for the command prompt to appear
    Then the <username> show up
    When I write my <username> press enter
    Then the <password> show up
    When I write my <password> press enter
    Then the <passord again> show up
    When I write my <password> again press enter
    Then I see that 'super admin created successfully'
    
