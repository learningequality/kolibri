Feature: My downloads - Library page

  Background:
    Given I am signed in as a learner user
			And I am at *Learn > Library*
			And there are imported channels with resources on the device

	Scenario: User is not connected to any device, network, or external storage

	Scenario: Super admin is connected to the internet
	# Can see Studio library

	Scenario: Non-super admin is connected to the internet
	# Cannot see Studio library

	Scenario: User is connected to 1-3 libraries
	# Display channels from all libraries

	Scenario: User is connected to at least 4 other libraries and at least 1 is pinned

	Scenario: User is connected to at least 4 other libraries and none are pinned

	Scenario: There are many channels in a pinned library
	# Maximum of 2 rows of cards before showing "Explore this library" card

	Scenario: User begins a search while connected to other sources
	# Search is scoped to user's library only

	Scenario: User only sees their library's resources in the Recent section

	Scenario: Recent is limited to display 1 row of cards when there are other libraries to display
	# but paginates normally

	Scenario: See whether another library is an online server, desktop app, android app, or external storage
	# Icon next to device name
