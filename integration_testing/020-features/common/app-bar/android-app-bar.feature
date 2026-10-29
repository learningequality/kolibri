Feature: Device setup

  Background:
    Given that the Kolibri installation was successful
    	And I am signed in

	Scenario: Overflow on smaller breakpoints
		When I go to *Device > Channels* using a desktop browser
		Then I see all the tabs: *Channels*, *Permissions*, *Facilities*, *Info* and *Settings*
			And I see the full username of the user
			And I see the earned points of the user and a star icon
		When I shrink the browser window size to a mobile size
		Then I see a *...* ellipsis button to the right
			And I no longer see all of the tabs
			And I don't see the earned points
			And I see the star icon and the username which is truncated after XX characters
		When I click the *...* ellipsis button
		Then I see the *Info* and *Settings* tabs
		When I click the star icon #NOT IMPLEMENTED
		Then I see the value of the earned points

	Scenario: New bottom bar on the native Android app
		When I launch the Android app
		Then I see the bottom bar
			And I see the following tabs: *Home*, *Library*, *Bookmarks* and *Menu*
			And I see that I am at the *Home* tab which is in a selected state

	Scenario: Changing tabs on the native Android app
		Given I am at the *Home* tab
		When I select the *Menu* tab
		Then the menu opens to the plugin in which the user is currently
		When I select a page from the menu
		Then I am at the selected page
			And the menu is hidden
		When I scroll down
		Then both the top and the bottom bars hide #NOT IMPLEMENTED
		When I scroll up
		Then both bars appear again #NOT IMPLEMENTED
		When I am in a tab not accessible through the menu such as *Coach*, *Facility*, *Device*
		Then nothing in the app bar is selected

	Scenario: Updates to side menu
		When I select the *Menu* tab
		Then the menu opens to the plugin in which the user is currently
			And I can see that the *X* icon and the *Kolibri* label at the top
			And I can see my name, username and role
			And I can see my points
			And I can see that all the other sections of the menu are collapsed
			And I can see the *My downloads*, *Profile*, *Change language* and *Sign out* options
			And I can see the kolibri icon, version of Kolibri, and copyright text
			And I can see the *Usage and privacy* link

	Scenario: Updates to learn-only device side menu
		When I select the *Menu* tab
		Then I can see the *Device status* menu item
			And I can see an icon indicating the sync status of the device
			And I can see a label indicating the sync status of the device such as *Synced N minutes ago*
		When I scroll down
		Then I an see the *Learn-only device* menu item
			And I can see the following text: *Coach and admin features not available*

	Scenario: Changing to landscape mode on native Android app
		Given I am at the *Home* tab
		When I rotate the device in a landscape mode
		Then I can see the app bar
			And I can see all of the tabs evenly spaced
