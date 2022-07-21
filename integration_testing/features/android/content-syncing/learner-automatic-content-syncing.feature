Feature: Learners automatic syncing

  Background:
    Given I am signed in as a learner user

	Scenario: Learner on a learn-only device can see the device status in the side menu
		Given I am on a learn-only device
		When I expand the side menu
		Then I see a *Device status* label
			And I see the sync status icon
			And I see text informing me of the current sync status e.g. *Synced N minutes ago*

	Scenario: Learner does not have enough storage on their device for new automatic downloads, and My downloads is empty
		Given I don't have enough storage on my device
			And *My downloads* is empty
		When I go anywhere within the *Learn* plugin
		Then I see the following notification: *You do not have enough storage for new learning materials. Ask your coach or administrator for help.*
			And I see a *Close* button

	Scenario: Learner does not have enough storage on their device for new automatic downloads, and does have resources in My downloads
		Given I don't have enough storage on my device
			And *My downloads* is not empty
		When I go anywhere within the *Learn* plugin
		Then I see the following notification: *You do not have enough storage for updates. Try removing resources from My downloads.*
			And I see a *Go to my downloads* button
			And I see a *Close* button

	Scenario: Learner on learn-only device does not have enough storage for new automatic downloads of assigned resources, and My downloads is empty
		Given I'm a learner on a learn-only device
			And I don't have enough storage on my device
			And *My downloads* is empty
		When I go anywhere within the *Learn* plugin
		Then I see the following notification: *You do not have enough storage for new learning materials. Ask your coach or administrator for help.*
			And I see a *Close* button

	Scenario: Learner on learn-only device does not have enough storage for new automatic downloads of assigned resources, and does have resources in My downloads
		Given I'm a learner on a learn-only device
			And I don't have enough storage on my device
			And *My downloads* is not empty
		When I go anywhere within the *Learn* plugin
		Then I see the following notification: *You do not have enough storage for updates. Try removing resources from My downloads.*
			And I see a *Go to my downloads* button
			And I see a *Close* button

	Scenario: Some material was removed from My downloads to make room for assigned material
		Given I'm a learner on a learn-only device
			And I don't have enough storage on my device
			And *My downloads* is not empty
			And some resources have been removed to make room for new class materials
		When I go anywhere within the *Learn* plugin
		Then I see the following notification: *Some resources have been removed to make room for new class materials.*
			And I see a *Close* button

	Scenario: Learner allows metered data on first time use
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

	Scenario: Learner disallows metered data on first time use
		Given I have set my device to allow download on metered connection
			And I am about to do something that would use the metered connection for the first time in Kolibri
		Then I see the *Use metered data?* modal
			And I see *You are using a metered connection. If you are on a limited data plan, you may have to pay extra charges.*
			And I see the option *No do not use metered data* selected by default
			And I see the other option *Yes, use metered data*
			And I see a *Continue* button
		When I click *Continue*
		Then I see that I am not able to use the metered data #the *Other libraries* section would appear empty

	Scenario: Learner can see automatic syncing updates while not using the Android app
		Given I've closed Kolibri
			And it's still running in the background
		When I check my device notifications
			And there is an automatic syncing about to begin
		Then I see the following notification: *Updating your library*
			And I see the following import status *Waiting*
		When the automatic syncing has started
		Then I see the following notification: *Updating your library*
			And I see the following import status *In progress - N%*
		When the automatic syncing has finished successfully
		Then I see the following notification: *Library updated*

	Scenario: Learner can see that automatic syncing failed while not using the Android app
		Given I've closed Kolibri
			And it's still running in the background
			And the automatic syncing has failed
		When I check my device notifications
				Then I see the following notification: *Library update failed*
