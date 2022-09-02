Feature: My downloads - Library page

  Background:
    Given I am signed in as a learner user
			And I am at *Learn > Library*
			And there are imported channels with resources on the device

	Scenario: Learner is not connected to any device, network, or external storage
		Given I'm not connected to any device, network, or external storage
		When I load the *Learn > Library* page
			And I look at the *Other libraries* section of the page
		Then I see the label *Other libraries* connection status
		When the search is over
		Then I see *No other libraries around you right now*
			And I see *Searching for new materials around you* #TO DO, this is not clear

	Scenario: Learner is connected to the Internet and there are up 1-3 libraries
		Given I'm connected to the Internet and there are devices with available libraries
		When I load the *Learn > Library* page
			And I look at the *Other libraries* section of the page
		Then I see *Showing other libraries around you. Refresh*
			And I see a wi-fi icon next to the *Refresh* button
		When I click *Refresh*
		Then I see all the available pinned or unpinned libraries under the *Other libraries* section
			And I see the name of each device
			And I see up to 3 cards in a row for the resources on the device
			And I see *Explore this library* as the last card for each library
			And I cannot see any Studio libraries because I'm not logged in as a super admin

	Scenario: Learner is connected to at least 4 other libraries and at least 1 is pinned
		Given I'm connected to the Internet and there are at least 4 other libraries and at least 1 is pinned
		When I look at the *Other libraries* section of the page
		Then I see there only channels for pinned libraries
			And I see a *More libraries* section under the *Other libraries* section
			And I see some of the unpinned libraries
			And I see a *See all libraries* card

	Scenario: There are more than 5 channels in a pinned library
		Given I'm connected to the Internet and there is at least 1 pinned library
			And there are more than 5 channels in the pinned library
		When I look at the *Other libraries* section of the page
		Then I see maximum of 2 rows of cards
			And I see *Explore this library* card as the last card of the second row

	Scenario: Learner is connected to at least 4 other libraries and none are pinned
		Given I'm connected to the Internet and there are at least 4 other libraries and none are pinned
		When I look at the *Other libraries* section of the page
		Then I see up to 5 cards for unpinned libraries
			And I see *See all libraries* card as the last card on the second row

	Scenario: Learner begins a search while connected to other sources
		Given I'm connected to other sources
		When I search by a keyword or apply a search filter
		Then I see results for channels and resources scoped to my library only
			And I don't see search results from other libraries

	Scenario: Learner only sees their library's resources in the *Recent* section
		Given I'm connected to other sources
			And I've interacted with resources from both my library and other libraries
		When I look at the *Recent* section
		Then I see up to 2 rows of resources only from my library
			And I see the *View more* link if there are more than 6 resources

	Scenario: Recent is limited to display 1 row of cards when there are other libraries to display
		Given I'm connected to other sources
			And I've interacted with resources from both my library and other libraries
		When I look at the *Recent* section
		Then I see only one row of cards
			And I see the *View more* link if there are more than 3 resources

	Scenario: See whether another library is an online server, desktop app, android app, or external storage
		Given I'm connected to other sources
		When I look at the *More libraries* section
		Then I can see an icon on each card specifying whether it is an online server, desktop app, android app, or external storage
