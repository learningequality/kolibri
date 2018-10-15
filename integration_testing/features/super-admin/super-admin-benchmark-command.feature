Feature: Super Admin benchmark manage command
    Super Admin needs to have a benchmark report of the server running Kolibri

  Background:
    Given that the Kolibri server is running
      And super admin has open a terminal in the Operative System

  Scenario: Kolibri running from source code
    Given that I have the terminal open
      And I have followed the needed steps to build Kolibri and have it running
    When I enter <kolibri manage benchmark>
      And I wait for the command prompt to appear again
    Then I see a complete report with performance and benchmarking information, splited in sections.


  Scenario: Kolibri running in Windows after using the Windows Installer
    Given that I have the terminal open
      And I use the File Browser to find the folder where Python is installed
    When I type <cd> in the terminal
      And drag the folder where Python is installed to drop it in the terminal
    Then I see something similar to <cd c:\Python3.4> in the terminal
    When I press Enter
    Then I see the prompt indicates I am into that folder
    When I enter <cd Scripts> to enter into the folder where Kolibri script exists
    Then I see the prompt indicates I am into the Scripts folder
    When I enter <kolibri manage benchmark>
      And I wait for the command prompt to appear again
    Then I see a complete report with performance and benchmarking information, splited in sections.

    Scenario: Kolibri running in Linux or Mac after using pip, the deb package or the Mac installer
      Given that I have the terminal open
    When I enter <kolibri manage benchmark>
      And I wait for the command prompt to appear again
    Then I see a complete report with performance and benchmarking information, splited in sections.

