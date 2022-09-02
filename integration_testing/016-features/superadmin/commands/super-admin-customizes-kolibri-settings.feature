Feature: Super admin customizes the Kolibri settings with the options.ini file
    Super admin needs to be able to customize the Kolibri settings by modifying the options.ini file

  Background:
    Given that the Kolibri server is not running
      And I have opened the "options.ini" file which is located inside the ".kolibri" folder
      And there are the following sections: [Cache], [Database], [Server], [Paths], [Urls], [Deployment], [Python], [Tasks], [Learn]

  Scenario: Change the default HTTP port
    When I add "HTTP_PORT = <port number>" under the [Deployment] section
      And I save my changes
      And I run the "kolibri start" command in the terminal or command prompt
    Then I see that the Kolibri server is running at <port number> port

  Scenario: Configure Kolibri to display a specific set of languages
    When I add "LANGUAGES = '<language intl_code>','<language intl_code>'" under the [Deployment] section
      And I save my changes
      And I run the "kolibri start" command in the terminal or command prompt
      And I go to the *Sign in* page and click the language selector
    Then I see only the specified languages in the language selector modal window
      And I can select a language and see the Kolibri UI displayed in the selected language

  Scenario: Change the default Content directory
    When I add "CONTENT_DIR = <content folder>" under the [Paths] section
      And I save my changes
      And I run the "kolibri manage content movedirectory <destination>" command in the terminal or command prompt
    Then I can see the content moved in the destination folder

  Scenario: Change the default central content base URL
    When I add "CENTRAL_CONTENT_BASE_URL = <content base URL>" under the [Urls] section
      And I save my changes
      And I run the "kolibri start" command in the terminal or command prompt
      And I go to *Device > Channels*
      And I click the *Import* button
    Then I see the *Select a source* modal
      And I see the *Kolibri Studio (online)* option selected
    When I click the *Continue* button
    Then I see the *Select resources for import* page
      And I can see all the available resources

  Scenario: Change the default Data portal syncing base URL
    Given my facility is registered to a Project on Kolibri Data Portal
    When I add "DATA_PORTAL_SYNCING_BASE_URL = <data portal URL>" under the [Urls] section
      And I save my changes
      And I run the "kolibri start" command in the terminal or command prompt
      And I go to *Device > Facilities*
      And I click the *Sync* button
    Then I see the *Select a source* modal
    When I select *Kolibri Data Portal*
      And I click *Continue*
    Then I see the list of facilities
      And I see a *Syncing* message under <facility>
      And I see an indeterminate spinner
      And I see there is a new task in *Device > Tasks*
    When the <facility> is done syncing
      Then I see a message under the <facility> *Last synced: just now*

  Scenario: Enable custom channel navigation
    When I add "ENABLE_CUSTOM_CHANNEL_NAV = True" under the [Learn] section
      And I save my changes
      And I run the "kolibri start" command in the terminal or command prompt
      And I go to *Device > Channels*
      And I click the *Import* button
    Then I see the *Select a source* modal
      And I see the *Kolibri Studio (online)* option selected
    When I click the *Continue* button
    Then I see the *Select resources for import* page
      And I can see all the available resources
    When I click *Import with token*
    Then I see the *Enter channel token* modal
    When I input a token for a channel with custom navigation such as "bovir-dubov"
    	And I click *Continue*
    Then I see the imported channel
    When I go to the *Learn > Library* page
    	And I click on the channel with custom navigation
    Then I am at the *Browse channel* modal window
    	And I can interact with the contents of the channel


Examples:
  | port number | language intl_code | content folder                   | content fallback folder  | content base URL                              |
  | 8081        | en                 | C:\Users\IEUser\.kolibri\content | C:\Users\IEUser\.kolibri\| https://hotfixes.studio.learningequality.org/ |
