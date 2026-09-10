 Feature: Debian/Ubuntu app installation
  A user needs to be able to install Kolibri on a supported Debian/Ubuntu device

  Background:
    Given that I have downloaded the kolibri .deb file on a supported Debian/Ubuntu device

  Scenario: Install Kolibri from a .deb file
    When I run the *sudo dpkg -i kolibri-installer-filename.deb* command from the location where I have downloaded the .deb file
    Then I see that the installation is in progress
    When the installation has finished
    	And I run the *kolibri start* command
    	And I open the default browser at http://127.0.0.1:8080
    Then I see the first step of the *Setup wizard*
