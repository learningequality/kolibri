Feature: Super admin can see the Windows installer translated strings
    Super admin can see the Windows installer translated strings during the Kolibri Windows install/uninstall

    Background:
        Given That the Windows language setting is in <language>
        Given I am using Windows environment
        And I have the Kolibri Windows installer

# List of translation from Spanish to English
# "Control de cuentas usuario" > "User Account Control"
# "Seleccionar idioma de Configuración" > "Select Setup Language"
# "Kolibri configuración" > "Kolibri Setup Wizard"
# "Iniciar Kolibri" > "Launch Kolibri"
# "Desinstalar un programa" > "Uninstall a Program"
# "Aceptar" > "Ok"
# "Sí" > "yes"
# "Siguiente" > "Install"
# "Finalizar" > "Finish"
# "Panel de control" > "Control Panel"

Scenario: Display the translated strings at the Select Setup Language dialog
    When I double click the Kolibri Windows installer
      And I see the dialog "Control de cuentas usuario"
      And I click the "Sí" button
      And I see the "Seleccionar idioma de Configuración" dialog
    Then I see that the translated strings are displayed properly

Scenario: Install Kolibri with translated strings
    When I double click the Kolibri Windows installer
      And I see the dialog "Control de cuentas usuario"
      And I click the "Sí" button

      And I see the "Seleccionar idioma de Configuración" dialog
      And I select <language>

      And I click the "Aceptar" button
      # If the Python version 3.4 is not yet installed in this Windows environment
      And I see the setup message box that Python is required to install
      And I click "Sí" to install Python
    Then I see that Python is installing
      And I click "Siguiente" button
      And I continue the Kolibri installation
    Then I see that every "Kolibri configuración" has translated strings that displayed properly
    When I see the Kolibri setup has finished installing
      And I checked the "Iniciar Kolibri" check box
      And I click the "Finalizar" button
    Then I see the Kolibri notification that properly display the translated strings

Scenario: Uninstall Kolibri with translated strings
    When I navigate at the "Panel de control"
      And I click the "Desinstalar un programa"
      And I double click the "entry for Kolibri"
      And I see the dialog "Control de cuentas usuario"
      And I click the "Sí" button
    Then I see that the translated strings are displayed properly
      And I continue the Kolibri uninstallation
    Then I see that Kolibri successfully uninstalled

Examples:
| language |
| Spanish  |
