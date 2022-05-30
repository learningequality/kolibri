Feature: Post-setup onboarding

  Background:
    Given that the Kolibri installation was successful
    	And I have completed the device setup

	Scenario: Finish *On my own* setup path - connected to the internet
		Given I've finished the *On my own* setup path as a super admin
			And I'm connected to the internet
		When I go to the *Library* page
		Then I see the following inline tip: *Your downloaded channels and learning materials will be here. You can also find and explore the libraries on devices of other people around you.*
		When I click *Continue*
		Then I see another inline tip: *You can explore someone else’s library when you see this symbol.*
		When I click *Continue*
		Then I see the next inline tip: *Use the menu to find other ways to use Kolibri*
		When I click *Continue*
		Then I see the next inline tip: *You can download channels and learning materials from the Device page.*
		When I click *Continue*
		Then I see the next inline tip: *You can download channels and learning materials from the Device page.*

	Scenario: Finish *On my own* setup path - connected to other Kolibri server on local network

	Scenario: Finish *Learn-only* setup path - Import individual user - connected to the internet

	Scenario: Finish *Full device* setup path
	# Gets directed to Device > Channels

	Scenario: Use Kolibri for the first time on a device that's already been set up
