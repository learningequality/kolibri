 Feature: MacOS app installation
  A user needs to be able to install Kolibri on a supported MacOS device

  Background:
    Given that I have downloaded the kolibri-0.19.dmg file on a supported MacOS device

  Scenario: Mac app installation
  	Given that the kolibri app is not installed and running (not intended for use as a server).
  	When I download the .dmg installer for Kolibri
    	And I double-click the downloaded *.dmg* file
    Then I see a new window open
    When I drag the app icon to the Applications folder icon in that window
    Then I see the *Copying "Kolibri" to Applications* progress bar
    When the copying process has finished
    	And I click the *Launchpad*
    Then I see the *Kolibri* icon
    When I click the *Kolibri* icon
    Then I see a *Starting Kolibri* screen
    	And I see the first step of the installation wizard
