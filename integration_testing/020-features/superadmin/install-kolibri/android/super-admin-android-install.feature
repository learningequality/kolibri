 Feature: Android app installation
  A user needs to be able to install Kolibri on a supported Android device

  Background:
    Given that I have downloaded the kolibri.apk file on a supported Android device

  Scenario: Android app installation
    When I tap the Kolibri installer
    Then I see the following message: *Install this app?*
    	And I see a *Cancel* and an *Install* button
    When I tap the *Install* button
    Then I see *Installing...*
    	And I see *App installed.* #when installing a build which is not from the official *Play store* you may see the following message from *Google Play Protect*: *Play Protect hasn't seen an app from this developer before. It may be unsafe. Installing this app may put your device at risk. Learn more about Play Protect. Install anyway*
    	And I see a *Done* and an *Open* button
    When I tap *Open*
    Then I see the Kolibri logo
    	And I see a loading icon #If your device runs Android 13 or higher, apps must explicitly ask for runtime permission via android.permission.POST_NOTIFICATION the first time you open them. If you previously denied this prompt, you must go into *Settings > Apps > [App Name] > Notifications* to manually grant permission.
    When the app has been fully loaded
    Then I am at the first step of the setup wizard
