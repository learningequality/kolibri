 Feature: Android app installation
  A user needs to be able to install Kolibri on a supported Android device

  Background:
    Given that I have downloaded the kolibri.apk file on a supported Android device

  Scenario: Android app installation
    When I tap the Kolibri installer
    Then I see the following message: *Do you want to install this app?*
    	And I see a *Cancel* and an *Install* button
    When I tap the *Install* button
    Then I see *Installing...*
    	And I see *App installed.*
    	And I see a *Done* and an *Open* button
    When I tap *Open*
    Then I see the Kolibri logo
    	And I see a loading icon
    When the app has been fully loaded
    Then I am at the first step of the installation wizard
    	And I see *Please select the default language for Kolibri*
