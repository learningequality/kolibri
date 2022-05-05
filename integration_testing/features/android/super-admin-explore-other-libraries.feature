Feature: Explore other libraries

  Background:
    Given I am signed in as a super admin
    	And I am connected to the internet and to other devices on the network
			And I am at *Learn > Library*
			And there are imported channels with resources on the device

	Scenario: Explore someone else's library
		When I load the *Learn > Library* page
			And I look at library in the *Other libraries* section of the page
			And I click the *Explore this library* card
		Then I see the *Explore libraries* page
			And I see the search by keyword and the search filters to the left
			And I see a *All libraries* link at the top
			And I see a *Library of '<device>'* label
			And I see all the available channels for the selected library

	Scenario: Go to explore *All libraries* page
		Given there are at least 4 other libraries and at least 1 is pinned
		When I look at the *Other libraries* section of the page
		Then I see there only channels for pinned libraries
			And I see a *More libraries* section under the *Other libraries* section
			And I see some of the unpinned libraries
			And I see a *See all libraries* card
		When I click the *See all libraries* card
		Then I see the *All libraries* page
			And I see a *All libraries* label
			And I see *Showing the libraries on other devices and networks around you* below the *All libraries* label
			And I see the available unpinned full devices #TO DO needs clarification whether we see the pinned devices too
			And I see the available learn-only devices
			And I see the *External storage* section
			And I see an *Explore* button next to each section
			#TO DO describe when the *More libraries* section is displayed

	Scenario: Pin a library
		Given I am at the *All libraries* page
		When I click the pin icon next to a unpinned library
		Then the color of the icon is changed to black
		When I close the *Explore library* page
		Then I am back at the *Library* page
			And I can see the newly pinned library

	Scenario: Remove pin from a library
		Given I am at the *All libraries* page
		When I click the pin icon next to a pinned library
		Then the color of the icon is changed to white
		When I close the *Explore library* page
		Then I am back at the *Library* page
			And I can see the that the unpinned library is no longer displayed there

	Scenario: Show other learn-only devices under "More libraries" #TO DO needs clarification why only learn-only devices

	Scenario: Go to explore Kolibri Content Library

	Scenario: Filter channels by language while browsing Kolibri Content Library

	Scenario: Filter search results by language while browsing Kolibri Content Library

	Scenario: Go to explore another library

	Scenario: See whether resources are available in a folder
	# Wifi icon on folder cards

	Scenario: See whether an individual resource is available
	# Wifi icon on resource cards

	Scenario: Add resource to My downloads from folder/resource browsing page

	Scenario: Add resource to My downloads from the information panel

	Scenario: View a resource while browsing another library

	Scenario: Add resource to My downloads from the content renderer
	# The '+' icon should turn into the bookmark icon after clicking it

	Scenario: User becomes disconnected while browsing another library
