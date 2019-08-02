Feature: Super admin can see the Windows installer translated strings
    Super admin can see the Windows installer translated strings during the Kolibri Windows install/uninstall

    Background:
      Given that I have the Kolibri Windows installer
        And I am using a Windows environment

Scenario: Set the Windows environment language into other languages
    When I double click the Kolibri Windows installer
      And I see the select setup language
    Then I see that the strings are properly displayed at the select setup language page

Scenario: See translated strings during Kolibri Windows installation
    When I double click the Kolibri Windows installer
      And I select a <language>
      And I see the setup message box that Python is required to install
      And I click "yes" to install Python
    Then I see the Python is installing
      And I click "ok" button
      And I continue the Kolibri installation
    Then I see that the Kolibri setup strings are translated with the <language>

Scenario: See translated strings during Kolibri Windows uninstallation
    When I click the "Uninstall Kolibri"
    Then I see the setup message box with a translated strings of <language>
      And I continue the Kolibri uninstallation
    Then I see that Kolibri successfully uninstalled

Examples:
| language |
| Spanish  |
