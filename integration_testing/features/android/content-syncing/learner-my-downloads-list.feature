Feature: My downloads list

  Background:
    Given I am signed in as a learner user
    	And I have a number of downloaded resources visible at *My downloads*

	Scenario: Select *My downloads* from the side menu
		When expand the side menu
		Then I see *My downloads* under *Device*
		When I click on *My downloads*
		Then I am at the *My downloads* page
			And the side menu is no longer expanded

	Scenario: *My downloads* - desktop view
		Given I'm viewing Kolibri in a desktop browser
		When I go to *My downloads*
		Then I see all the resources displayed in a table with *Name*, *File size* and *Date added* columns
			And I see a *My downloads* label
			And I see *Total size of My downloads XX MB*, *Total size of my library YY MB*, and *Free disk space XXX MB* above the list with cards
			And I see a drop-down filter *Activity type*
			And I see a drop-down filter *Sort by*
			And in each row I see the resource type icon, resource label, resource size and date added
			And I see the *View* and *Remove* buttons to the right
			And I see a *Select all* checkbox and checkboxes for each resource
			And I see *XX-YY* pager with left and right arrows
			And I see a disabled *Remove selected* button

	Scenario: *My downloads* - mobile view #TODO as the design was changed
		Given I'm viewing Kolibri in a mobile browser
		When I go to *My downloads*
		Then I see all the resources displayed in a table with *Name*, *File size* and *Date added* columns
			And I see a *My downloads* label
			And I see *Total size of My downloads XX MB*, *Total size of my library YY MB*, and *Free disk space XXX MB* above the list with cards
			And I see a drop-down filter *Activity type*
			And I see a drop-down filter *Sort by*
			And in each row I see the resource type icon, resource label, resource size and date added
			And I see the *View* and *Remove* buttons to the right
			And I see a *Select all* checkbox and checkboxes for each resource
			And I see *1-25 out of XXX* pager with left and right arrows
			And I see a disabled *Remove selected* button

	Scenario: Go to a resource
		Given I am at the *My downloads* page
		When I click the *View* button of a resource
		Then I am at the resource page
			And I can interact with the resource
		When I click the back arrow
		Then I am back at the *My downloads* page

	Scenario: Remove a resource
		Given I am at the *My downloads* page
		When I click the *Remove* button of a resource
		Then I see the *Remove from library* modal
			And I see the following text: *You will no longer be able to use this resource and will need to download it again later.*
		When I click the *Remove* button
		Then the resource is removed from *My downloads*

	Scenario: Remove several resources
		Given I am at the *My downloads* page
		When I select several resources for removal
			And I click the *Remove selected* button
		Then I see the *Remove from library* modal
			And I see the following text: *You will no longer be able to use these resources and will need to download them again later.*
		When I click the *Remove* button
		Then the resources are removed from *My downloads*

	Scenario: *My downloads* page when there are no resources #TODO as the design was changed and there isn't a new design screen for that scenario
		Given I am at the *My downloads* page
			And there are no downloaded resources
		When I look at *My downloads*
		Then I see only the following text: *No resources*
