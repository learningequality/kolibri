Feature: Post-setup onboarding

  Background:
    Given that the Kolibri installation was successful
    	And I have completed the device setup

	Scenario: Finish *On my own* setup path - first user (super admin) #NOT IMPLEMENTED
		Given I've finished the *On my own* setup path as a super admin
			And I'm connected to the Internet
			And there are no channels on the device
		When I go to the *Library* page
		Then I see that the filter panel is hidden
			And I see the *Add materials* modal
			And I see the following text: *Choose learning materials to use on your device*
		When I click *Continue*
		Then I see the following inline tip: *Your downloaded channels and learning materials will be here. You can also find and explore the libraries on devices of other people around you.*
		When I click *Continue*
		Then I see the following inline tip displayed over the first card of the *Kolibri content library*:: *You can explore someone else’s library when you see this symbol.*
		When I click *Continue*
		Then I see the next inline tip next to the highlighted menu bar: *Use the menu to find other ways to use Kolibri*
		When I click *Continue*
		Then I see the menu expanded and an inline tip for the highlighted *Device* menu item: *You can download channels and learning materials from the Device page.*
		When I click *Continue*
		Then I am at the *Library* page
			And I no longer see any inline tips

	Scenario: Finish *On my own* setup path - connected to other Kolibri server on local network #NOT IMPLEMENTED
		Given I've finished the *On my own* setup path as a super admin
			And I'm connected to another Kolibri server on the local network
		When I click on a library card
		Then I see the *Explore libraries* modal
			And I see the following inline tip for the highlighted *Folders* tab: *Explore folders for each channel to find more learning materials.*
		When I click *Continue*
		Then I see the following inline tip for the highlighted *Search* tab: *Use filters to find learning materials by language, type of activity, or keywords.*
		When I click *Continue*
		Then I see the following inline tip for a highlighted card: *Learn more about this learning material and download it to use anytime.*

	Scenario: Finish *Learn-only* setup path - Import individual user - connected to the Internet #NOT IMPLEMENTED
		Given I've finished the *On my own* setup path as a learner
			And I'm connected to the Internet and another Kolibri server on the local network
		When I go to the *Library* page
		Then I see that the filter panel is hidden
			And I see the following inline tip next to the highlighted *Library* tab: *Your downloaded channels and learning materials will be here. You can also find and explore the libraries on devices of other people around you.*
		When I click *Continue*
		Then I see the following inline tip displayed over the first card of the *Kolibri content library*:: *You can explore someone else’s library when you see this symbol.*
		When I click *Continue*
			And I click on the card
		Then I see the *Explore libraries* modal
			And I see the following inline tip for the highlighted *Folders* tab: *Find more learning materials in the folders of this channel.*
		When I click *Continue*
		Then I see the following inline tip for the highlighted *Search* tab: *Use filters to find learning materials by language, type of activity, or keywords.*
		When I click *Continue*
		Then I see the following inline tip for a highlighted card: *Learn more about this learning material and download it to use anytime.*

	Scenario: Finish *Full device* setup path #NOT IMPLEMENTED
		Given I've selected the *Full device* setup path at *What kind of device is this?*
		When I finish the setup
		Then I am redirected to *Device > Channels*
			And I see the *Channels* label
			And I see the following text: *Channels are collections of learning materials. Explore your network to start finding channels*
			And I see an *Import* button
		When I click the *Import* button
		Then I see the *Select a source* modal

	Scenario: All users - not connected to any source
		Given I've finished the setup up path
			And I'm not connected to any source
			And I don't have content yet
		When I go to the *Library* page
		Then I see a *Your library* label
			And I see the following text: *There is nothing in your library yet. Explore libraries around you and start adding materials to your own.*
			And I see the following text to the right: *No other libraries around you right now.*
			And I see a *Refresh* link next to the text

	Scenario: First time use - content already on device #NOT IMPLEMENTED
		Given there's content already on device
		When I finish the setup up path
		Then I see the following message: *Welcome to [facility name]. Learning materials from your classes can be found on the home page.*
		When I click *Continue*
		Then I am at the *Library* page
			And I see the following inline tip next to the highlighted filters panel: *Use filters to find materials by language, activity, or keywords*
		When I click *Continue*
		Then I see the *Explore libraries* modal
			And I see the following inline tip for the highlighted *Folders* tab: *Find more learning materials in the folders of this channel.*
		When I click *Continue*
		Then I see the following inline tip for the highlighted *Search* tab: *Use filters to find learning materials by language, type of activity, or keywords.*
		When I click *Continue*
		Then I see the following inline tip for the highlighted *Show available resources only* toggle: *Turn this off to see learning materials that you don’t have yet.*
		When I click *Continue*
		Then I see the following inline tip for a highlighted card: *When you add a resource you don’t have yet to My downloads, Kolibri will automatically download it when another library around you has it.*
		When I click *Continue*
		Then I am at the content page
			And I see the following inline tip: *See more information about this material, download it for later use, and find related materials.*
