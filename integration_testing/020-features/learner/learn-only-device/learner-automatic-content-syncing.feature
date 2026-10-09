Feature: Learners automatic syncing

  Background:
    Given I am signed in as a learner on a learn-only device (LOD)
    	And there is a Kolibri server in the network
  				And a coach has enrolled the learner to a class and assigned lesson and quiz resources to the learner

	Scenario: LOD - Assigned lesson and quiz resources are automatically transferred to the learn-only device
  	Given I am signed in as learner on a learn-only device
  		And there is a Kolibri server in the network
  		And a coach has enrolled the learner to a class and assigned lesson and quiz resources to the learner
  	When I go to the *Home* page
  		And I click on the class name
  	Then I see all the lesson and quiz resources already downloaded on my device
  	When I complete a resource
  	Then after a reasonable period of time the data is synced to the server
  		And a coach is able to see the lesson and quiz completion progress at *Coach > Class home* and *Coach > Lessons*, *Coach > Quizzes* and *Coach > Learners*
  	When a coach assigns a new lesson or a quiz
  	Then after a reasonable period of time the resources get automatically transferred to the learn-only device
  		And I am able to interact with and complete the resources
  	When I expand the sidebar
  	Then I can see sync status of my device under *Device status*
  	When I go to *Learn > Library*
  	Then I see the *Your library* section
  		And I can see all the channels containing the resources which were assigned to me and were automatically transferred to the device
  		And I can see the *Other libraries* section
  		And I can explore all the available channels there

	Scenario: LOD - Learners can see special messaging that their device is in a special mode
		When I expand the sidebar
		Then I see the following message indicating that my device is in a Learn-only mode: *Learn-only device Coach and admin features not available*

	Scenario: LOD - Learner can see the device status in the side menu
		When I expand the sidebar
		Then I see a *Device status* label
			And I see the sync status icon and label # e.g. Synced, Syncing, Waiting to sync, Not recently synced or unable to sync, Not enough storage, Not connected to server
			And I see text informing me of the current sync status e.g. *Synced N minutes ago*

	Scenario: LOD - Learner does not have enough storage on their device for new automatic downloads, and My downloads is empty
		Given I don't have enough storage on my device
			And *My downloads* is empty
		When I go anywhere within the *Learn* plugin
		Then I see the following notification: *You do not have enough storage for new learning materials. Ask your coach or administrator for help.*
			And I see a *Close* button

	Scenario: LOD - Learner does not have enough storage on their device for new automatic downloads, and does have resources in My downloads
		Given I don't have enough storage on my device
			And *My downloads* is not empty
		When I go anywhere within the *Learn* plugin
		Then I see the following notification: *You do not have enough storage for updates. Try removing resources from My downloads.*
			And I see a *Go to my downloads* button
			And I see a *Close* button

	Scenario: LOD - Learner allows mobile data on first time use
		Given I have set my device to allow download on mobile connection
			And I am about to do something that would use the mobile connection for the first time in Kolibri
		Then I see the *Use mobile data?* modal
			And I see *You may have a limited amount of data on your mobile plan. Allowing Kolibri to download resources via mobile data may use up your entire plan and/or incur extra charges.*
			And I see the option *Do do not allow Kolibri to use mobile data* selected by default
			And I see the other option *Allow Kolibri to use mobile data*
			And I see a *Continue* button
		When I select the *Allow Kolibri to use mobile data* option
			And I click *Continue*
		Then I see that I am able to use the mobile data

	Scenario: LOD - Learner disallows mobile data on first time use
		Given I have set my device to allow download on mobile connection
			And I am about to do something that would use the mobile connection for the first time in Kolibri
		And I see *You may have a limited amount of data on your mobile plan. Allowing Kolibri to download resources via mobile data may use up your entire plan and/or incur extra charges.*
			And I see the option *Do do not allow Kolibri to use mobile data* selected by default
			And I see the other option *Allow Kolibri to use mobile data*
			And I see a *Continue* button
		When I click *Continue*
		Then I see that I am not able to use the mobile data #the *Other libraries* section would appear empty

	Scenario: LOD - Learner can see automatic syncing updates while not using the Android app
		Given I've closed Kolibri
			And it's still running in the background
			And I have allowed Kolibri to run in the background and see notification
		When I check my device notifications
			And there is an automatic syncing about to begin
		Then I see the following notification: *Updating your library*
			And I see the following import status *Waiting*
		When the automatic syncing has started
		Then I see the following notification: *Updating your library*
			And I see the following import status *In progress - N%*
		When the automatic syncing has finished successfully
		Then I see the following notification: *Library updated*

	Scenario: LOD - Learner can see that automatic syncing has failed while not using the Android app
		Given I've closed Kolibri
			And it's still running in the background
			And the automatic syncing has failed
		When I check my device notifications
				Then I see the following notification: *Library update failed*

	Scenario: Learners can see device syncing statuses
		When the learner device is attempting to sync to the classroom server
			And I open the user menu in the top appbar
		Then I see a *device status* indicator showing the device is syncing
		When the learner device has successfully synced
			And I open the user menu in the top appbar
		Then I see a *device status* indicator showing the device has synced a number of minutes ago

	Scenario: Learners can see errors associated with device syncing
		When the learner device is unable to sync with the classroom server
			And I open the user menu in the top appbar
		Then I see a *device status* red error indicator showing the device is not recently synced
		When the learner device has successfully synced in the past but is unable to currently sync
			And I open the user menu in the top appbar
		Then I see a *device status* red error indicator showing the device has synced a number of minutes ago

	Scenario: Learners can see that the device is not connected to the classroom server
		When the learner device is not connected to the classroom server
			And I open the user menu in the top appbar
		Then I see a *device status* indicator showing the device is not connected
