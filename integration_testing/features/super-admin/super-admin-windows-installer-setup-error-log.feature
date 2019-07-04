Feature: Super admin Windows installer setup failed show the error logs
    Super admin needs to be able to see the error logs when the Kolibri Windows installation failed

    Background:
        Given that I have the Kolibri Windows installer
          And I am using a Windows environment

    Scenario: Install the kolibri Windows installer with the error
        And I double click the Kolibri Windows installer
        And I see and select a kolibri <language>
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
| Spanish | language |
