 Feature: Windows app installation
  A user needs to be able to install Kolibri on a supported Windows 7, 8.1, 10 and 11 device

  Background:
    Given that I have downloaded the kolibri-0.20-windows-setup.exe file on a supported Windows device

  Scenario: Windows app installation
  	Given that the kolibri-server is not installed and running
  	When I download the .exe installer for Kolibri
    	And I double-click the downloaded *.exe* file
    Then I see the *Select Setup Language* screen
    	And I see a *Select the language to use during the installation.* text
    	And I see a language selector drop-down
    	And I see an *OK* and a *Cancel* button
    When I click the *OK* button
    Then I see the *Select Destination Location* screen
    	And I see that *C:\Program Files\Kolibri* is the default path
    When I click the *Next* button
    Then I see the *Select Start Menu Folder* screen
    	And I see that *(Default)* is the default value
    When I click the *Next* button
    Then I see the *Select Additional Tasks* screen
    	And I see that *Run Kolibri automatically when the computer starts* and *Create a desktop icon* are selected by default
    When I click the *Next* button
    Then I see the *Ready to Install* screen
    When I click the *Install* button
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
    	And I see the *Kolibri* app running
    	And I see the *How are you using Kolibri?* step of the setup wizard
