Feature: Super admin can see error logs during a failed Windows installer setup
    Super admin needs to be able to see the error logs when the Kolibri Windows installation failed

    Background:
      Given that I have the Kolibri Windows installer
        And I am using a Windows environment
        And I double click the Kolibri Windows installer

    Scenario: Install the kolibri Windows installer with the error
      When I see and select a kolibri <language>
        And I see the setup message box that Python is required to install
        And I click "yes" to install Python
      Then I see the Python is installing
        And I manually delete or rename the "pip.exe" in the "C:\Python34\Script" path
        And I continue the Kolibri installation
        And the kolibri error message show up
      Then I see the kolibri error dialog box
      When I click the Kolibri log link
      Then I see all the installation error logs

Examples:
| language |
| Spanish  |
