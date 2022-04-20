Feature: Device settings
	The user needs to be able to change settings related to external devices, default landing page, download on metered connection, storage location, auto-import and enabled pages

  Background:
    Given that the Kolibri installation was successful
    	And I've set up the device
    	And I am signed in
    	And I am on *Device > Settings* page

	Scenario: Change the default language
		When I click the *Change language* dropdown menu
			And I select <language>
			And I click *Save changes*
		Then I see a *Settings have been updated* message
		When I sign out and relaunch the app
		Then I see that the Kolibri UI is displayed in <language> language

	Scenario: Allow external devices to import unlisted channels
		Given I have at least one unlisted channel
		When I click the checkbox *Allow other computers on this network to import my unlisted channels*
		Then I see that the checkbox is checked
		When I click *Save changes*
			And I try to import an unlisted channel using another computer in the same network
		Then I can see the unlisted channel
			And I can import the unlisted channel

	Scenario: Set the default landing page to *Learn page*
    When I select *Learn page* as the *Default landing page*
    Then I see that the *Sign-in page* option is no longer selected
    	And I see that the options *Allow users to access resources without signing in*, *Learners must sign-in to explore resources* and *Signed in learners should only see resources assigned to them in classes* are disabled (grayed out)
    When I click the *Save changes* button
      And I sign out
    Then I see the *Learn > Library* page
    When I sign-in as learner <username>
    Then I also see the *Learn > Library* page

  Scenario: Set the default landing page to *Sign-in page - Allow users to access resources without signing in*
  	When I select *Sign-in page* as the *Default landing page*
  	Then I see that the *Sign-in page* option is selected
  		And I see that the *Allow users to access resources without signing in* option is also selected
  	When I click the *Save changes* button
      And I sign out
    Then I see the *Sign-in* page
    	And I see the *Explore without account* link
    When I click the *Explore without account* link
    Then I see the *Learn > Library* page

  Scenario: Set the default landing page to *Sign-in page - Learners must sign in to explore resources*
		Given I've selected the *Sign-in page* as the *Default landing page*
		When I select the *Learners must sign-in to explore resources* option
			And I click the *Save changes* button
      And I sign out
    Then I see the *Sign-in* page
    	And I don't see the *Explore without account* link

  Scenario: Set the default landing page to *Sign-in page - Signed in learners should only see resources assigned to them in classes*
  	Given I've selected the *Sign-in page* as the *Default landing page*
  	When I select the *Signed in learners should only see resources assigned to them in classes* option
			And I click the *Save changes* button
      And I sign out
    Then I see the *Sign-in* page
    When I sign-in as learner <username>
    Then I see the *Learn > Home* page
      And I don't see the *Library* or *Bookmarks* tabs

	Scenario: Allow download on metered connection
		When I select the *Allow download on a metered connection* option
			And I click the *Save changes* button
		Then I see a *Settings have been updated* message #next steps to be further discussed

	Scenario: Change the storage location
		When I click the *Change* link
		Then I see the *Storage location* modal
			And I see that the current path is already selected
			And I see a number of other available paths
			And I see an *Add new location* option
		When I select a different path
			And I click *Save*
		Then I can see the new storage path #some additional details to be further clarified

	Scenario: Disable auto-import
		Given the *Enable auto-import* option is checked
		When I uncheck the option
		Then I see both *Enable "Get later"* and *Set auto-import storage limit* options disabled
		When I click the *Save changes* button
			And I go to *Device - Channels* page
		Then I see that the *Get later* option is not available #to be further clarified

	Scenario: Enable auto-import
		Given the *Enable auto-import* option is not checked
		When I check the *Enable auto-import* checkbox
		Then I see both *Enable "Get later"* and *Set auto-import storage limit* options enabled and checked
		When I go to *Device - Channels* page
			And I mark a resource for Kolibri to automatically import it #needs further clarification how exactly
		Then I can see that the resource is auto-imported when the resource is available in the network
		When I've specified a storage limit value
		Then I can see that resources are no longer auto-imported once the storage limit is reached

	Scenario: Enable pages
		Given all pages are enabled by default
		When I uncheck any or all of the available pages
			And I click the *Save changes* button
		Then a learner is no longer able to access the unchecked pages #to be further clarified
