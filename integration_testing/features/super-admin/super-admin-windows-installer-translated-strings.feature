Feature: Super admin can see the Windows installer translated strings
    Super admin can see the Windows installer translated strings during the Kolibri Windows install/uninstall

    Background:
      Given That the Windows language setting is in <language>
        And I am using Windows environment
        And I have the Kolibri Windows installer

Scenario: Display the translated strings at the "Select Setup Language" dialog
    When I double click the Kolibri Windows installer
      And I see the dialog "User Account Control"
      And I click the "Yes" button
      And I see the "Select Setup Language" dialog
    Then I see that the translated strings are displayed properly

Scenario: Install Kolibri with translated strings
    When I double click the Kolibri Windows installer
      And I see the dialog "User Account Control"
      And I click the "Yes" button
      And I see the "Select Setup Language" dialog
      And I select <language>
      And I click the "Ok" button
      # If the Python version 3.4 is not yet installed in this Windows environment
      And I see the setup message box that Python is required to install
      And I click "Yes" to install Python
    Then I see that Python is installing
      And I click "Install" button
      And I continue the Kolibri installation
    Then I see that every "Kolibri Setup Wizard" has translated strings that displayed properly
    When I see the Kolibri setup has finished installing
      And I checked the "Launch Kolibri" check box
      And I click the "Finish" button
    Then I see the Kolibri notification that properly display the translated strings

Scenario: Uninstall Kolibri with translated strings
    When I navigate at the "Control Panel"
      And I click the "Uninstall a Program"
      And I double click the " Kolibri version"
      And I see the dialog "User Account Control"
      And I click the "Yes" button
    Then I see that the translated strings are displayed properly
      And I continue the Kolibri uninstallation
    Then I see that Kolibri successfully uninstalled

Examples:
| language |
| Spanish  |
