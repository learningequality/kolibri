Feature: Super admin can see error logs during a failed Windows installer setup
  Super admin needs to be able to see the error logs when the Kolibri Windows installation fails

  Background:
    Given I am installing Kolibri on Windows OS
      And I double click the Kolibri Windows installer

  Scenario: Kolibri Windows installer exits with an error
    When I see the setup message that Python is required to install
      And I click "Yes" to install Python
    Then I see the Python is installing
      And I manually delete or rename the "pip.exe" in the "C:\Python34\Script" path
      And I continue the Kolibri installation
    Then I see a Kolibri error message 
    When I click the 'Kolibri-setup.log' link
    Then I see the installation error log file 

Examples:
| language |
| Spanish  |
