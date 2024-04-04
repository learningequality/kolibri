Feature: Learners automatic syncing

  Background:
    Given I am signed in as learner on a learn-only device (LOD)
    	And there is a Kolibri server in the network
  				And a coach has enrolled the learner to a class and assigned lesson and a quiz resources to the learner

	Scenario: LOD - Assigned lesson and quiz resources are automatically transferred to the learn-only device
  	Given I am signed in as learner on a learn-only device
  				And there is a Kolibri server in the network
  				And a coach has enrolled the learner to a class and assigned lesson and a quiz resources to the learner
  	When I go to the *Home* page
  		And I click on the class name
  	Then I see all the lesson and quiz resources already downloaded on my device
  	When I complete a resource
  	Then a coach is able to see the lesson and quiz completion progress at *Coach > Class home* and *Coach > Reports*
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

	Scenario: LOD - Learner allows metered data on first time use #Will be enabled in Kolibri 0.17
		Given I have set my device to allow download on metered connection
			And I am about to do something that would use the metered connection for the first time in Kolibri
		Then I see the *Use metered data?* modal
			And I see *You are using a metered connection. If you are on a limited data plan, you may have to pay extra charges.*
			And I see the option *No do not use metered data* selected by default
			And I see the other option *Yes, use metered data*
			And I see a *Continue* button
		When I select the *Yes, use metered data* option
			And I click *Continue*
		Then I see that I am able to use the metered data

	Scenario: LOD - Learner disallows metered data on first time use #Will be enabled in Kolibri 0.17
		Given I have set my device to allow download on metered connection
			And I am about to do something that would use the metered connection for the first time in Kolibri
		Then I see the *Use metered data?* modal
			And I see *You are using a metered connection. If you are on a limited data plan, you may have to pay extra charges.*
			And I see the option *No do not use metered data* selected by default
			And I see the other option *Yes, use metered data*
			And I see a *Continue* button
		When I click *Continue*
		Then I see that I am not able to use the metered data #the *Other libraries* section would appear empty

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
