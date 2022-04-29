Feature: My downloads list

  Background:
    Given I am signed in as a learner user

	Scenario: Select *My downloads* from the side menu
		When expand the side menu
		Then I see *My downloads* under *Device*
		When I click on *My downloads*
		Then I am at the *My downloads* page
			And the side menu is no longer expanded

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
