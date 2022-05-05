Feature: Explore other libraries

  Background:
    Given I am signed in as a learner user
    	And I am connected to other devices on the network
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

	Scenario: Show other learn-only devices under "More libraries" #TO DO needs clarification why only learn-only devices

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
