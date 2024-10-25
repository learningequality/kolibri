Feature: My downloads - Library page

  Background:
    Given I am signed in as a super admin user
    	And I am connected to the Internet
			And I am at *Learn > Library*
			And there are imported channels with resources on the device

	Scenario: Super admin is able to see Kolibri Studio libraries
		When I load the *Learn > Library* page
			And I look at the *Other libraries* section of the page
		Then I see the *Kolibri content library* section
			And I see up to 5 cards on up to 2 rows
			And I see the cards sorted by the user's preferred language #valid only if the user set a preferred language during the 0.16 device setup or changed it in their profile
			And I see *Explore this library* as the last card

	Scenario: Super admin goes to Kolibri Studio
		Given I see the *Kolibri content library* section
		When I click *Explore this library*
		Then I go to the main library page for Kolibri Studio
