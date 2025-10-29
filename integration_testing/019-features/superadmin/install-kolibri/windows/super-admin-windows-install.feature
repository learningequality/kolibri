 Feature: Windows app installation
  A user needs to be able to install Kolibri on a supported Windows 7, 8.1 and 10 device

  Background:
    Given that I have downloaded the kolibri-v0.16-windows-setup.exe file on a supported Windows device

  Scenario: Windows app installation
    When I double-click the downloaded *.exe* file
    Then I see the *Select Setup Language* screen
    	And I see a *Select the language  to use during the installation.* text
    	And I see a language selector drop-down
    	And I see an *OK* and a *Cancel* button
    When I click the *OK* button
    Then I see the *Setup* screen informing me that I need to have Python 3.6+ installed in order to run Kolibri.
    	And I see a *Yes* and a *No* button
    When I click the *Yes* button
    Then I see Python being installed in the background
    	And after that I see the *Select Destination Location* screen
    	And I see an option to select a different folder and a *Browse* button
    	And I see a *Next* and a *Cancel* button
    When I click *Next*
    Then I see the *Ready to install* screen
    	And I see information about the destination location and the *Start Menu* folder
    	And I see a *Back*, an *Install* and a *Cancel* button
    When I click *Install*
    Then I see the *Installing* screen
    	And I see a progress bar
    	And I see a *Cancel* button
    When the copying of files has finished
    Then I see the *Completing the Kolibri Setup Wizard* screen
    	And I see a text informing me that the setup has finished
    	And I see a checked checkbox *Launch Kolibri*
    	And I see a *Finish* button
    When I click the *Finish* button
    Then I see a *Kolibri is starting* notification in the notification bar
    	And I see *Kolibri* running at http://127.0.0.1:8080/en/
