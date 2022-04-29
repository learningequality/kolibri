Feature: My downloads list

  Background:
    Given I am signed in as a learner user

	Scenario: Select *My downloads* from the side menu
		When expand the side menu
		Then I see *My downloads* under *Device*
		When I click on *My downloads*
		Then I am at the *My downloads* page
			And the side menu is no longer expanded

	Scenario: *My downloads > Downloaded* - mobile view
		Given I'm viewing Kolibri in a mobile browser
		When I go to *My downloads*
		Then I see all the resources displayed in a single column view
			And I see the contents of the *Downloaded* tab by default
			And I see *On your device now XX MB*, *Total size of My downloads YY MB*, and *Free disk space XXX MB* above the list with cards
			And in each card I see the thumbnail, resource type, resource label, resource size, channel image and channel name
			And I see the *View* button, the *i* icon and the *X* icon at the bottom right corner

	Scenario: *My downloads > Download later* - mobile view
		Given I'm viewing Kolibri in a mobile browser
		When I go to *My downloads*
			And I select the *Download later* tab
		Then I see all the resources displayed in a single column view
			And I see *These resources will automatically download when you connect to another device or network that has them*
			And I see *On your device now XX MB*, *Total size of My downloads YY MB*, and *Free disk space XXX MB* above the list with cards
			And in each card I see the thumbnail, resource type, resource label, resource size, channel image and channel name
			And I see the *View* button, the *i* icon and the *X* icon at the bottom right corner

	Scenario: Go to a resource in the *Downloaded* tab
		Given I am at the *My downloads* page
			And there are downloaded resources
			And I am viewing the *Downloaded* tab
		When I click the *View* button of a resource
		Then I am at the resource page
			And I can interact with the resource

	Scenario: Remove a resource from the *Downloaded* tab
		Given I am at the *My downloads* page
			And there are downloaded resources
			And I am viewing the *Downloaded* tab
		When I click the *x* icon of a resource
		Then the resource is removed from the *Downloaded* tab

	Scenario: View information panel of a resource in the *Downloaded* tab
		Given I am at the *My downloads* page
			And there are downloaded resources
			And I am viewing the *Downloaded* tab
		When I click the *i* icon of a resource
		Then I see the side information panel for the resource

	Scenario: Remove a resource from the *Download later* tab
		Given I am at the *My downloads* page
			And I am viewing the *Download later* tab
			And I have a number of resources pending to be downloaded later
		When I click the *x* icon of a resource
		Then the resource is removed from the *Download later* tab

	Scenario: View information panel of a resource in the *Download later* tab
		Given I am at the *My downloads* page
			And I am viewing the *Download later* tab
			And I have a number of resources pending to be downloaded later
		When I click the *i* icon of a resource
		Then I see the side information panel for the resource

	Scenario: *My downloads* page when there are no resources
		Given I am at the *My downloads* page
			And there are no downloaded resources
		When I look at *My downloads > Downloaded*
		Then I see only the following text: *No resources*
		When I go to *My downloads > Download later*
		Then I see only the following text: *These resources will automatically download when you connect to another device or network that has them*
			And on the next line I see the following text: *No resources*
