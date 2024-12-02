Feature: Device setup

  Background:
    Given that the Kolibri installation was successful

	Scenario: Load the Kolibri app for the first time during device setup #NOT IMPLEMENTED
		When I open the app for the first time
		Then I see a static image of the Kolibri logo
			And I see messages under the logo
		When I click an arrow
		Then I can cycle through the messages
		When the loading completes
		Then I see a *Get started* button

	Scenario: *On my own* setup
		Given I am using a desktop browser
			And Kolibri has finished loading after opening it for the first time
		When I click *Get started* #this step is not implemented yet
		Then I see *How are you using Kolibri?*
			And I see that the checkbox for *On my own* is selected by default
		When I click *Continue*
		Then I see *Please select the default language for Kolibri*
			And at the top right corner I see an option to change the current language
		When I click the button which is labeled as the currently selected language
		Then I see the *Change language* modal
		When I select a language
			And I press the *Confirm* button
		Then I see the interface changed to the selected language
		When I click *Continue*
		Then I see the *Create super admin* page
			And I see the Kolibri logo to the left, the language selector to the right and a label *Create super admin*
			And I see the text *This super admin account allows you to manage all facilities, resources, and users on this device.*
			And I see the *Full name*, *Username*, *Password* and *Re-enter password* fields*
			And I see the *Usage and privacy* link and the text *Important: please remember this account information. Write it down if needed.*
		When I fill in the *Full name*, *Username*, *Password* and *Re-enter password* fields
			And I click *Continue*
		Then I see the Kolibri loading icon
			And I see *Setting up Kolibri*
			And I see *This may take several minutes*
		When Kolibri finishes loading
		Then I see a modal *Welcome to Kolibri!*
		When I click *Continue*
		Then I am at *Learn > Library* page

	Scenario: Group learning - Full device - Create facility with default options
		Given I am at the *How are you using Kolibri?* page
			And I select the *Group learning* option
		When I click *Continue*
		Then I see the *Device name* page
			And I can see the device name pre-filled in the *Device name* field
		When I click *Continue*
		Then I see the *What kind of device is this?* page
			And I see that the *Full device* option is selected
		When I click *Continue*
		Then I am at the *Set up the learning facility for this full device* page
			And I see that the *Create a new learning facility* option is selected
		When I click *Continue*
		Then I am at the *What kind of learning environment is your facility?* page
			And I see that the *Non-formal* option is selected
		When I click *Continue*
		Then I am at the *Enable users to explore Kolibri without an account?* page
			And I see that the *Yes* option is selected
		When I click *Continue*
		Then I am at the *Allow learners to join this facility?* page
			And I see that the *Yes* option is selected
		When I click *Continue*
		Then I am at the *Enable passwords on learner accounts?* page
			And I see that the *Yes* option is selected
		When I click *Continue*
		Then I am at the *Responsibilities as an administrator* page
		When I click *Continue*
		Then I see the *Create super admin* page
		When I fill in the *Full name*, *Username*, *Password* and *Re-enter password* fields
			And I click *Continue*
		Then I see the *Setting up Kolibri* page
		When the setup has finished
		Then I am at the *Device > Channels* page
			And I can see the *Welcome to Kolibri!* modal

	Scenario: Group learning - Full device - Create a formal facility
		Given I am at the *How are you using Kolibri?* page
			And I select the *Group learning* option
		When I click *Continue*
		Then I see the *Device name* page
			And I can see the device name pre-filled in the *Device name* field
		When I click *Continue*
		Then I see the *What kind of device is this?* page
			And I see that the *Full device* option is selected
		When I click *Continue*
		Then I am at the *Set up the learning facility for this full device* page
			And I see that the *Create a new facility* option is selected
		When I click *Continue*
		Then I am at the *What kind of learning environment is your facility?* page
		When I select *Formal*
			And I click *Continue*
		Then I am at the *Enable guest access?* page
			And I see that the *No. Users must have an account to view resources on Kolibri* option is selected
		When I click *Continue*
		Then I am at the *Allow learners to join this facility?* page
			And I see that the *No. Admins must create all accounts* option is selected
		When I click *Continue*
		Then I am at the *Enable passwords on learner accounts?* page
			And I see that the *No. Learner accounts can sign in with just a username* option is selected
		When I click *Continue*
		Then I am at the *Responsibilities as an administrator* page
		When I click *Continue*
		Then I see the *Create super admin* page
		When I fill in the *Full name*, *Username*, *Password* and *Re-enter password* fields
			And I click *Continue*
		Then I see the *Setting up Kolibri* page
		When the setup has finished
		Then I am at the *Device > Channels* page
			And I can see the *Welcome to Kolibri!* modal

	Scenario: Group learning - Full device - Import all data from an existing learning facility
		Given I am at the *Set up the learning facility for this full device* page
		When I select the *Import all data from an existing facility* option
			And I click *Continue*
		Then I see the *Select network address* modal
			And I can select a network address
		When I click *Continue*
		Then I am at *Select learning facility* #this page is shown only if there's more than 1 facility on the selected device
			And I see all of the available facilities
		When I select a facility
			And I click *Continue*
		Then I am at the *Import learning facility - 1 of 4* page
			And I see *Import learning facility*
    	And I see the name of the device from which I am importing
    	And I see the network address of that device
    	And I see *Enter the username and password for a facility admin of '<facility>' or a super admin of '<device>'*
		When I enter the username and password of a facility admin or super admin
			And I click *Continue*
		Then I am at the *Import learning facility - 2 of 4* page
			And I see *Loading '<facility>'*
			And I see loading status bar
		When the facility has finished loading
		Then I see the status *Finished*
			And I see a green check icon
			And I see *The '<facility>' learning facility has been successfully loaded to this device*
		When I click *Continue*
		Then I am at the *Import learning facility - 3 of 4* page
			And I see *Select super admin*
			And I see a dropdown for super admin
			And I see the username of the admin that I used to load the facility
		When I enter a password
			And I click *Continue*
		Then I am at the *Import facility - 4 of 4* page
			And I see *Responsibilities as an administrator*
			And a the *Usage and privacy* link
		When I click *Continue*
		Then I see the *Setting up Kolibri* page
		When the setup has finished
		Then I am at the *Device > Channels* page
			And I can see the *Welcome to Kolibri!* modal

	Scenario: Group learning - Learn-only - Join a facility
		Given I am at the *Select a facility setup for this device* page
		When I select *Create a new user account for an existing facility*
			And I click *Continue*
		Then I am at the  *Select facility* page #this page is shown only if there's more than 1 facility on the selected device
			And I see a list of facilities in my network
			And I see *Don't see your facility?*
			And I see *Add new address*
		When I click *Continue*
		Then I am at the page *Create your account*
			And I see text fields for *Full name*, *Username*, *Password* and *Re-enter password*
			And I see the *Usage and privacy* link
		When I fill in *Full name*, *Username*, *Password* and *Re-enter password*
			And I click *Continue*
		Then I am at the *Load user account* page
			And I see a progress bar
		When the process is complete
		Then I see *'<full name>' from <facility> successfully loaded to this device*
			And I see a green check icon
		When I click *Finish*
		Then I see *Setting up Kolibri*
			And I see *This may take several minutes*
			And I see the Kolibri loading icon
		When the setup has finished
		Then I can see the *Welcome to Kolibri!* modal
		When I click *Continue*
		Then I am at the *Learn > Library* page

	Scenario: Group learning - Learn-only - Import individual users
		Given I am at the *Select a facility setup for this learn-only device* page
		When I select the *Import one or more existing user accounts from an existing facility?* option
			And I click *Continue*
		Then I see the *Select network address* modal
			And I can select a network address
		When I click *Continue*
		Then I am at *Select learning facility* #this page is shown only if there's more than 1 facility on the selected device
			And I see all of the available facilities
		When I select a facility
			And I click *Continue*
		Then I am at the *Import individual user accounts - 1 of 2* page
			And I see *Import individual user accounts*
			And I see the name of the device from which I am importing
			And I see the network address of that device
			And I see *Enter the credentials of the user account you want to import*
 		When I enter the username and password of a learner
			And I click *Continue*
		Then I am at the *Import individual user accounts - 2 of 2* page
			And I see *Loading user*
			And I see a progress bar
		When the import has finished
		Then I am at the *Loading user* page
			And I see a green check icon
			And I see *'<full name>' from <facility> successfully loaded to this device*
			And I see an *Import another user account* link
		When I click *Finish*
		Then I see the *Setting up Kolibri* page
		When the setup has finished
		Then I can see the *Welcome to Kolibri!* modal
		When I click *Continue*
		Then I am at the *Learn > Home* page

	Scenario: Group learning - Learn-only - Facility not available in *Join a facility* setup path
		Given I selected the *Group learning* setup option
			And I am on the *Select facility* page
			And there is another Kolibri server running with <facility> in my network
			And the facility setting *Allow learners to join this facility?* for <facility> is disabled
		When I try to select the facility <facility>
		Then I see that the facility <facility> is disabled in the list
			And I see *You don't have permission to join this facility*

	Scenario: Use the device setup wizard on the smallest breakpoint
		Given Kolibri has finished loading after opening it for the first time in a mobile device
			And I see a *Get started* button
		When I click *Get started*
		Then I am at the *How are you using Kolibri?* page
			And I see a button with the current language at the top right
			And I do not see a page container
			And I see a white background
			And I see the *On my own* and *Group learning* radio buttons
			And I see a full-width *Continue* button at the bottom of the page
		When I click *Continue*
		Then I see *What language do you want to learn in?*
			And I see a back arrow icon in the top left

	Scenario: Use the *On my own* setup option on the native Android app
		# Users should not have to create an account for the *On my own* setup path on the native app
		Given I am using the native Android app
			And I selected the *On my own* setup path
		Then I see the page *What language do you want to learn in*
		When I click *Continue*
		Then I see *Setting up Kolibri*
			And I see *This may take several minutes*
			And I see the Kolibri loading icon
			And I do not see the create account form

	Scenario: Different layout in the native Android app for the step *Select a facility setup for this device*
  	# Switch order of *learn-only device* and *full device* sections in the Android app
		Given I am using the native Android app
			And I selected the *Group learning* setup option
			And I completed the *Device name* step
		Then I see the *Select a facility setup for this device* page
			And I see *Learn-only device* section is above the *Full device* section
