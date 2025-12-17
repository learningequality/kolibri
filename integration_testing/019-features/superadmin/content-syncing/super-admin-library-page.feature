Feature: Super admin can see and explore the Kolibri library

  Background:
    Given I am signed in as a super admin user
    	And I am connected to the Internet
			And I am at *Learn > Library*
			And there are imported channels with resources on the device

	Scenario: Super admin is able to see Kolibri Studio library
		When I load the *Learn > Library* page
			And I look at the *Other libraries* section of the page
		Then I see the *Kolibri library* section
			And I see up to 6 cards on up to 2 rows

	Scenario: Super admin can explore libraries
		Given I see the *Kolibri library* section
		When I click *Explore* button
		Then I the *Explore libraries* modal
			And I see all of the available channels
			And I can filter by keywords, categories, activities, language, level and accessibility
		When I click on a channel card
		Then I see all of the folders and resources of the channel
