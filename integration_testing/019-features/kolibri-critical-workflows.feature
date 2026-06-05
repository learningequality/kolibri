Feature: Kolibri critical workflows
  This is a test suite of the main Kolibri workflows.

  Background:
    Given that the kolibri-server is not installed and running

  Scenario: Install Kolibri from a .deb file
    When I download the .deb installer for Kolibri
      And I run the *sudo dpkg -i kolibri-installer-filename.deb* command from the location where I have downloaded the .deb file
    Then I see that the installation is in progress
    When the installation has finished
    	And I run the *kolibri start* command
    	And I open the default browser at http://127.0.0.1:8080
    Then I see the first step of the *Setup wizard*

  Scenario: Setup Wizard - *On my own* setup
  	Given I am using a desktop browser
  		And Kolibri has finished loading after opening it for the first time
	  	And I see *How are you using Kolibri?*
  		And I see that the checkbox for *On my own* is selected by default
  	When I click *Continue*
  	Then I see *Please select the default language for Kolibri*
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

  Scenario: Change learning facility - default path
  	Given I’ve set up my Kolibri device with the *On my own* device setup option
  		And I am signed in
  		And I am at the *Profile* page
  		And there are other Kolibri facilities in the network
  	When I click the *Change* button
  	Then I see *Select* facility
  		And I see a list with facilities
  		And I see that the first facility in the list is selected
  		And I see an *Add new device* link
  	When I click *Continue*
  	Then I see a *Change learning facility* label
  		And I see *You are about to move your account and progress data to ‘<facility>’ learning facility. Your current data will still be available to you and will also be accessible to any administrators of this learning facility. You can also search for an account in ‘<facility>’ to merge with. Progress data from both accounts will be combined into one account.*
  		And I see a *Merge accounts* option and a *Continue* button
  	When I click *Continue*
  	Then I see a *Confirm account username* label
  		And I see: *You are about to join ‘<facility>’ learning facility as ‘<username>’. You can continue using this username or create a new account username for <facility>*
  		And I see a *Create new account* option and a *Continue* button
  	When I click *Continue*
  	Then I see a *Create new password* label #shown only if the facility requires accounts to have passwords
  		And I see: *‘<facility>’ requires accounts to have passwords. Enter a password that you would like to use for ‘<username>’ in ‘<facility>’. You can enter your current password if you already have one.*
  		And I see a *Password* and *Re-enter password* fields
  		And I see: *Important: please remember this account information. Write it down if needed.*
  	When I fill in the password fields
  	Then I see a *Choose a new admin* label #shown only if the user is the only super admin
  		And I see a list with available accounts to manage channels and accounts
  		And I see a disabled *Continue* button
  		And I see a *Back* button
  	When I select a user
  		And I click *Continue*
  	Then I see a *Changing learning facility* label
  		And I see a progress bar
  	When the process has finished
  	Then I see a *Changing learning facility* label
  		And I see a green check icon and a *Finished* label
  		And I see *Successfully joined '<facility>' learning facility.*
  	When I click *Finish*
  	Then I am at the *Library* page
  		And I am signed in
  	When I open the sidebar
  	Then I see that the user is a learner on a learn-only device
  		And I see the *Device status*
  		And I see only the *Learn* and *Device* sections of the sidebar

  Scenario: Learn-only device - assigned lesson and quiz resources are automatically transferred to the LOD
  	Given I am signed in as learner on a learn-only device
  		And there is a Kolibri server in the network
  		And a coach has enrolled the learner to a class and assigned lesson and quiz resources to the learner
  	When I go to the *Home* page
  		And I click on the class name
  	Then I see all the lesson and quiz resources already downloaded on my device
  	When I complete a resource
  	Then a coach is able to see the lesson and quiz completion progress at *Coach > Class home* and *Coach > Reports*
  	When a coach assigns a new lesson or a quiz
  	Then after a reasonable period of time the resources get automatically transferred to the learn-only device
  		And I am able to interact with and complete the resources
  	When I expand the sidebar
  	Then I can see the sync status of my device under *Device status*
  	When I go to *Learn > Library*
  	Then I see the *Your library* section
  		And I can see all the channels containing the resources which were assigned to me and were automatically transferred to the device
  		And I can see the *Other libraries* section
  		And I can explore all the available channels there

  Scenario: Setup Wizard - Group learning - Full device - Create a formal facility
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

  Scenario: Setup Wizard - Group learning - Full device - Import all data from an existing learning facility
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

	Scenario: Setup Wizard - Group learning - Learn-only - Join a facility
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

	Scenario: Setup Wizard - Group learning - Learn-only - Import individual users
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

  Scenario: Setup Wizard - Group learning - Full device - Create facility with default options
  	Given I am at the *How are you using Kolibri?* page
  		And I select the *Group learning* option
  	When I click *Continue*
  	Then I see the *Device name* page
  	When I fill in the device name in the *Device name* field
  		And I click *Continue*
  	Then I see the *What kind of device is this?* page
  		And I see that the *Full device* option is selected
  	When I click *Continue*
  	Then I am at the *Set up the learning facility for this full device* page
  		And I see that the *Create a new learning facility* option is selected
  	When I click *Continue*
  	Then I am at the *What kind of learning environment is your facility?* page
  		And I see that the *Non-formal* option is selected
  	When I fill in the learning facility name
  		And I click *Continue*
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

  Scenario: Super admin imports content from Studio
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Device > Channels*
  	  And I am connected to the internet
  	When I click the *Import* button
  	Then I see the *Select a source* modal
  		And I see the *Kolibri Studio (online)* option selected by default
  	When I click *Continue*
  	Then I am at *Select resources to import*
  		And I see a list of available channels
  	When I click the *Select resources* button next to a channel
  	Then I see the channel page with logo, name, and version of the channel
  	  And I see the total number and size of the channel resources
  	  And I see the list of folders for the channel
  	  And I see that the *Import* button is inactive
  	When I check the *Select all* checkbox
  	Then I see the *Import* button is active
  	When I click the *Import* button
  	Then I am at the *Task manager* page
  		And I see the *Import resources from <channel>* progress bar
  		And I see the number and size of the resources being imported
  		And I see the *Cancel* button
  	When the import process concludes
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button

  Scenario: Super admin imports content from local network or attached drive
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Device > Channels*
  	  And there are other Kolibri server devices in my local network
  	  And there is an attached drive or memory card to the device
	  	And I am at the *Select a source* modal
  	When I select the *Local network or internet* option
  		And I click *Continue*
  	Then I see the *Select device* modal
  		And I see that the first available device is pre-selected
  	When I click *Continue*
  	Then I am at *Select resources to import*
  		And I see a list of available channels
  	When I click the *Select resources* button next to a channel
  	Then I see the channel page with logo, name, and version of the channel
  	  And I see the total number and size of the channel resources
  	  And I see the list of folders for the channel
  	  And I see that the *Import* button is disabled
  	When I check the *Select all* checkbox
  	Then I see the *Import* button is enabled
  	When I click the *Import* button
  	Then I am at the *Task manager* page
  		And I see the *Import resources from <channel>* progress bar
  		And I see the number and size of the resources being imported
  		And I see the *Cancel* button
  	When the import process concludes
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button
  	When I close the *Task manager* modal
  	Then I am back at *Device > Channels*
  	When I click the *Import* button
  	Then I see the *Select a source* modal
  	When I select the *Attached drive or memory card* option
  		And I click *Continue*
  	Then I see the *Select drive* modal
  		And I see that the first available drive is pre-selected
  	When I click *Continue*
  	Then I am at *Select resources to import*
  		And I see a list of available channels
  	When I click the *Select resources* button next to a channel
  	Then I see the channel page with logo, name, and version of the channel
  	  And I see the total number and size of the channel resources
  	  And I see the list of folders for the channel
  	  And I see that the *Import* button is disabled
  	When I check the *Select all* checkbox
  	Then I see the *Import* button is enabled
  	When I click the *Import* button
  	Then I am at the *Task manager* page
  		And I see the *Import resources from <channel>* progress bar
  		And I see the number and size of the resources being imported
  		And I see the *Cancel* button
  	When the import process concludes
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button
  	When I close the *Task manager* modal
  	Then I am back at *Device > Channels*
  		And I see all of the imported channels

  Scenario: Super admin exports content to an attached drive
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Device > Channels*
  	  And there is an attached drive or memory card to the device
  	When I click the *Options* drop-down
  		And I select the *Export channels* option
  	Then I see the *Export channels* modal
  		And I see all the channels on the device
  	When I select a channel
  		And I click the *Export* button
  	Then I see the *Select a drive* modal
  		And I see that the first available drive is pre-selected
  	When I click *Continue*
  	Then I am at the *Task manager* page
  		And I see the *Export <channel>* progress bar
  		And I see the number and size of the resources being exported
  		And I see a *Cancel* button
  	When the export has finished
  	Then I see the task is labeled as *Finished*
  		And I do not see the progress bar anymore
  		And I see the *Clear* button for the finished task
  		And I see the *Clear completed* button

  Scenario: Super admin creates a learner user account
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users*
    When I look at the *New users* page
    Then I see a *New user* button and an *Options* drop-down
    	And I see the *Search for a user* field
      And I see a *Filter* link
      And I see the disabled *Assign coach*, *Enroll in class*, *Remove from class* and *Delete selected* icons
      And I see the user's table with the *Full name*, *Username*, *Identifier*, *Gender*, *Birth year* and *Created at* columns
    When I click the *New user* button
    Then I see the *Create new user* side panel
    When I enter the user's full name
      And I enter the username
      And I enter the password
      And I re-enter the password
      And I leave the default value of *Learner* for the *User type*
      And I enter *Identifier* #optional
      And I select *Birth year* and *Gender* #optional
      And I don't make a selection from the *Enroll in class* field
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *New users* table

  Scenario: Super admin creates a new learner user account when no password is required
  	Given the *Enter username only* option is enabled at *Facility > Settings*
      And I am at the *Create new user* side panel
    When I enter the user's full name
      And I enter the username
      And I leave the default value of *Learner* for the *User type*
      And I enter *Identifier* #optional
      And I select *Birth year* and *Gender* #optional
      And I don't make a selection from the *Enroll in class* field
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *New users* table

  Scenario: Super admin creates a new learner user account when the *Picture password* is enabled
  	Given the *Picture password* option is enabled at *Facility > Settings*
      And I am at the *Create new user* side panel
    When I enter the user's full name
      And I enter the username
      And I leave the default value of *Learner* for the *User type*
      And I enter *Identifier* #optional
      And I select *Birth year* and *Gender* #optional
      And I don't make a selection from the *Enroll in class* field
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *New users* table
    When I click the *...* button for the user
    	And I select *Edit details*
    Then I can see the *Picture password* of the user #repeat the scenario with the standard icons enabled and with enabled icon names

  Scenario: Super admin creates a new learner user account and enrolls the learner in a class
    Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users > Create new user* side panel
    	And I have filled in all the required fields
    When I open the *Enroll in class* drop-down
      And I select a class #or multiple classes
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new learner user in the *New users* table
     When I go to *Facility > Classes*
     Then I can see that the user is enrolled in the specified class(es)

  Scenario: Super admin creates a new coach user account and assigns the coach to a class
    Given I am at *Facility > Users > Create new user* side panel
    	And I have selected *Coach* from the *User type* drop-down #this scenario can be executed for facility coach and admin users too
    	And I have filled in all the required fields
    When I open the *Assign to a class* drop-down
      And I select a class #or all/multiple classes
      And I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new coach user in the *New users* table
      And I see the *Coach* label next to the full name of the user
    When I go to *Facility > Classes*
     Then I can see that the coach is assigned in the specified class(es)

  Scenario: Super admin creates a facility coach user account
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users*
    	And I am at the *Create new user* side panel
    	And I have selected *Coach* from the *User type* drop-down
    	And have selected the *Facility coach* radio-button
    	And I have filled in all the required fields
    When I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new facility coach user in the *New users* table
      And I see the *Facility coach* label next to the full name of the user

  Scenario: Super admin creates an admin user account
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users*
    	And I am at the *Create new user* side panel
    	And I have selected *Admin* from the *User type* drop-down
    	And I have filled in all the required fields
    When I click the *Save and close* button
    Then the page reloads
      And I see the *User created* snackbar message
      And I see the new facility admin user in the *New users* table
      And I see the *Admin* label next to the full name of the user

  Scenario: Super admin searches for and finds a user using the search field
    Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users*
    When I click or tab into the search field
      And I start typing the user's full name or username
    Then I see that the list of users below is being filtered corresponding to the typed characters
      And I see the number of pages decreasing accordingly
    When I've typed enough characters for all the other users to be excluded
    Then I see only the user matching the typed full name or username

  Scenario: Super admin filters users
    Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users*
    When I click on the *Filter* link
    Then I see the *Filter users* side panel
    	And I see sections for the following filters: User type, Class and Birth year
    When I select any of the available options
    	And I click the *Apply filters* button
    Then I see only users matching the applied filters
    	And I see an *N filters* link
    	And I see a *Clear filters* link
    When I click the *Clear filters* link
    Then I see the full (unfiltered) list of users
      And I see the full number of pages

  Scenario: Super admin creates a new class
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Classes*
    When I click the *New class* button
    Then I see the *Create new class* modal
    When I fill in the *Class name* field
      And I click the *Save* button
    Then the page reloads
      And I see the the snackbar confirmation that the class has been created
      And I see that the new class is added to the *Classes* table

  Scenario: Super admin copies a class with learners and coaches
    Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Classes*
  	  And there is at least one already created class with enrolled learners and assigned coaches
    When I click on the *⋮* button for a class
    	And I click the *Copy class* option
    Then I see the *Copy class* modal
    	And I see a *Class name* field
    	And I see a *Copy of <class name>* text in the field
    	And I see a selected *Copy all learners (N)* checkbox
    	And I see an unselected *Copy all coaches (N)* checkbox
    When I enter a new class name in the *Class name* field
    	And I select both checkboxes
      And I click the *Make a copy* button
    Then the modal closes
      And I see a *Class copied successfully* snackbar message
      And I see the copied class in the *Classes* table
      And I see the correct number of coped coaches and learners

  Scenario: Super admin enrolls learners to a class
      Given I am signed in to Kolibri as a super admin
  	  	And I am at *Facility > Classes*
  	  	And there are created classes
      When I click on a class
      Then I see the class details page
      When I click the *Enroll learners* button
      Then I see the *Enroll learners into '<class>'* page
        And I see the list of all learners not enrolled in the class
        And I see that the *Confirm* button is not active
      When I click on the checkbox(es) of the learner(s) I want to enroll
      Then I see the *Confirm* button is active
      	And I see the number of selected learners
      When I click the *Confirm* button
      Then I see the class page again
        And I see the selected learner user accounts listed in the *Learners* table

  Scenario: Super admin deletes several users
    Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users*
    When I select several users from the table
    And I click the *Delete selected* icon
    Then I see the *Delete N users* modal
    When I click the *Delete* button
    Then the modal closes
      And I see the *Facility > Users* page again
      And I see the *Users deleted UNDO* snackbar message
    When I search for the deleted users in the search field
    Then I see the *No users match this search* text
    When I attempt to sign in to Kolibri as a deleted user
    Then I can see that this is not possible

  Scenario: Recover a deleted user who was assigned to or enrolled in a class
    Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users > Deleted users*
    When I look at the *Deleted users* page
    Then I see a *Deleted users* label
    	And I see the *Search for a user* field and a *Filter* link
    	And I see the disabled *Recover* and *Delete permanently* icons
      And I see the removed users table with the *Full name*, *Username*, *Identifier*, *Gender*, *Birth year* and *Permanent deletion* columns
    When I select a user
    Then I see that both the *Recover* and *Delete permanently* icons become enabled
    	And I see *1 user selected* text and a *Clear selection* link
    When I click the *Recover* icon
    Then I see a *1 user recovered* snackbar message
    	And the user is no longer listed in the *Deleted users* table
    When I go back to the *Facility > Users* page
    Then I can see that the recovered user is listed in the *Users* table
    When I go to *Facility > Classes*
    Then I can see that the user is either enrolled in or assigned to a class #depending on the user's role
    When I sign in to Kolibri as the recovered user
    Then I can see that all my previous data and interactions are kept in the state they were before the removal of the user

  Scenario: Coach creates a new lesson for the entire class and makes it visible to learners
  	Given I am signed in to Kolibri as a super admin or a coach
  	  And I am at *Coach > <class> > Lessons*
  	  And there are imported and bookmarked resources to the device
    When I click the *New lesson* button
    Then I see the *Create new lesson* modal
    When I fill in the title for the lesson
      And I fill in the description # optional
      And I click the *Save changes* button
    Then the modal closes
      And I see the lesson details page
      And I see a *Lesson created* snackbar message
      And I see that the *Visible to learners* toggle is switched off
      And I see that there are no resources in the lesson
		When I click on *Manage resources* button
    Then I see the *Manage lesson resources* side panel
			And I see the *Select from bookmarks* label and the *Bookmarks* card below it
			And I see the *Select from channels* card label and the channel cards for the available channels below it
			And I see a *Search* button next to the *Select from bookmarks* label
			And I see a *Save & finish* button at the lower right corner of the panel
		When I click on a channel card
		Then I see all of the available channel folders
		When I click on a folder with resources
		Then I can see the list with available resources
		When I select one or several resources
		Then I see the *N resource(s)selected (N MB)* link to the left of the *Save & finish* button
		When I click the *Save & finish* button
		Then I am back at the *Coach > <class> > Lesson > <lesson>* page
			And I see a *N resource(s) added* snackbar message
			And I can see that the selected resources are added to the table with lesson resources
		When I click the *Visible for learners* switch for a lesson
    Then I see the switch slide in the ON position (blue)
      And I see the *Lesson is visible to learners* snackbar notification
    When I click the *All lessons* link
    Then I am back at *Coach > Lessons*
    	And I can see that the lesson is with status set to *Visible to learners*

  Scenario: Coach creates a new quiz for the entire class and starts it
  	Given I am signed in to Kolibri as a super admin or a coach
  		And there are imported exercises on the device
  	  And I am at *Coach > <class> > Quizzes*
    When I click the *New quiz* button
    	And I select *Create new quiz*
    Then I see the *Create new quiz* modal
    	And I see an empty *Title* field
    	And I see the *Report visibility* drop-down with the *After learner submit quiz* option selected by default
    	And I see the *Recipients* section with the *Entire class* option selected by default
      And I see the *Section order* section with the *Fixed* option selected by default
    	And I see a *Section 1* tab with the following description text: *There are no questions in this section. To add questions, select resources from the available channels.*
    	And I see the *Add questions*, *Add section* and *Options* buttons
      And I see that both the *Save* and *Save and close* buttons are disabled
    When I fill in the title for the quiz
    	And I click the *Add questions* button
    Then I see the *Questions settings for 'Section 1'* side panel
    	And I see the *Number of questions* field with 10 set as default value
    	And I see the unchecked checkbox *Choose questions manually*
    	And I see an active *Continue* button at the bottom
    When I click the *Continue* button
    Then I see the *Add questions to 'Section 1'* side panel
      And I see *Select up to 10 resources*
    	And I see a *Settings* and a *Search* button next to it
      And I see the *Select from channels* and a list with the available channels
    When I click on a channel card
      And I select an exercise with enough questions
      And I click the *Add NN questions* button
    Then I am back at the *Create new quiz* page
    	And I see the *N questions successfully added* snackbar message
      And I see that the questions are added to *Section 1*
    When I click the *Add section* button
    Then I see the *Session settings* side panel
    When I fill in all fields
    	And I click *Add questions*
    Then I see the *Questions settings for '<section title>'* side panel
    	And I see the *Number of questions* field with 10 set as default value
    	And I see the unchecked checkbox *Choose questions manually*
    	And I see an active *Continue* button at the bottom
    When I select the *Choose questions manually* checkbox
    	And I click the *Continue* button
    Then I see the *Add questions to '<section title>'* side panel
      And I see *Select up to NN resources*
    	And I see a *Settings* and a *Search* button next to it
      And I see the *Select from channels* and a list with the available channels
    When I click the *Search* button
    Then I see the search panel
    	And I see the *Search by keyword* field
    	And I see the filters by *Category*, *Level*, *Language*, *Accessibility* and *Show resources*
    When I type a keyword
    	And I press the search icon
    Then I see all of the available results for the entered keyword
    When I click the *Search* button again
    Then I am back at the search panel
    When I apply any of the available active filters
    Then I see all of the available results for the applied filter and previously entered keyword
    	And I see the pills with labels of all the filters and the keyword with an *x* icon next to them
    	And I see a *Clear all* link
    When I click on a resource card
    Then I see a table with all of the questions available for selection
    When I select 1 or several questions
    	And I click the *Add N questions* button
    Then I am back at the *Create new quiz* page
    	And I see the *N questions successfully added* snackbar message
      And I see that the questions are added to the section
    When I click the *Save and close* button
    Then I am back at *Coach > Quizzes*
      And I see the *Changes saved successfully* snackbar message
    	And I see the newly created quiz
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then I see the *Quiz started* snackbar message

  Scenario: Guest user can create a learner account
  	Given that the *Allow learners to create accounts* setting is activated in *Facility > Settings*
      And I am at the Kolibri sign-in page
    When I click the *Create an account* button
    Then I am the *Create an account* page
    When I fill in the *Full name*, *Username*, *Password* and *Re-enter password* fields
     And I click the *Continue* button
    Then I am at the *Create an account* page
    When I select my gender and birth year
      And I click the *Finish* button
    Then I am signed in
    	And I am at the *Learn > Home* page

  Scenario: Users can sign in and sign out
  	Given I am viewing Kolibri for the first time in my current browser on a single facility device
      And the option *Enter username and password* is enabled at *Facility > Settings*
    When I open Kolibri in my browser
    Then I see the Kolibri logo, the name of the facility and a *Username* field
      And I see a disabled *Next* button
    When I enter my username
    Then the *Next* button becomes enabled
    When I click the *Next* button
    Then I see a *Signing in as '<username>'* text
      And a *Password* field
    When I enter my password
      And I click the *Sign in* button
    Then I am signed in
      And I am at the *Learn > Home* page
  		And I can navigate through the available pages based on my permissions
  	When I expand the sidebar
  		And I click on *Sign out*
  	Then I am back at the *Sign in* page
  		And I am no longer signed in
  	When I click the browsers back button
  	Then I see an *You were automatically signed out due to inactivity* snackbar message

  Scenario: Learner can sign in without a password
    Given I am viewing Kolibri for the first time in my current browser on a single facility device
      And the option *Enter username only* is enabled at *Facility > Settings*
    When I open Kolibri in my browser
    Then I see the Kolibri logo, the name of the facility and a *Username* field
     	And I see a disabled *Next* button
    When I enter my username
    Then the *Next* button becomes enabled
    When I click the *Next* button
    Then I am signed in and I am at the *Learn > Home* page

  Scenario: Learner can sign in with a picture password
    Given I am viewing Kolibri for the first time in my current browser on a single facility device
      And the option *Picture password* is enabled at *Facility > Settings*
    When I open Kolibri in my browser
    Then I see the Kolibri logo, the name of the facility and 12 child-friendly icons
      And I see a disabled 3-picture sequence field
      And I see a disabled right arrow button
      And I see an *Enter username instead* link
    When I select the correct 3-picture sequence
    Then the right arrow button becomes enabled
      And I see the 3-picture sequence to the left of it
    When I click the arrow button
    Then I see an *Is this you* confirmation modal
      And I see my name
      And I see the 3-picture sequence
      And I see an *X* button and a green checkmark button
    When I click the green checkmark button
    Then I am signed in
      And I am at the *Learn > Home* page

  Scenario: Learner completes an assigned lesson
  	Given I am signed in as a learner user
			And I am at *Learn > Home > Classes > '<class>'* page
			And there is a lesson assigned to me
			And the lesson contains each of the available resource types #exercise, document, video, audio, HTML
		When I complete each of the available resources in the lesson
		Then I see the *Completed* icon next to the lesson's title

  Scenario: Learner completes an assigned quiz
  	Given I am signed in as a learner user
			And I am at *Learn > Home > Classes > '<class>'* page
			And there is a quiz assigned to me
		When I submit the quiz
		Then I am back at *Learn > Home > Classes > '<class>'* page
			And I see a yellow star icon at the lower left corner of the quiz card
    	And I see the score of the quiz in percents

  Scenario: Learner can view the results for a completed quiz
  	Given I am signed in as a learner user
  		And I have successfully completed a quiz
  		And I am at *Home > Classes > <class>*
  	When I click on a quiz card
  	Then I see the details for that quiz such as title, status, questions answered correctly, time spent, attempted
  		And I see the answer history
  	When I click on a question
  	Then I see the question details
  		And I see a checkbox *Show correct answer*
  		And I see the number of attempts made on this question

  Scenario: Coach can take the class attendance(English only)
    Given I am signed in to Kolibri as a coach
    	And the option *Allow coaches to take attendance (English only)* is enabled at *Facility > Settings*
    	And there is a class with enrolled learners in it
      And I am at the *Coach - '<class>' > Class home* page
    When I click the *Mark attendance* button
    Then I am at the attendance page for the current time and date
      And I see a *Search for a learner* field and a *Mark all learners present* toggle button
      And I see a list of all the learners with a *Present* toggle button for each learner
      And I see a *Cancel* and a *Submit attendance* button
    When I mark each learner as either present or absent
      And I click the *Submit attendance* button
    Then I see the new entry added in the *Attendance history* table
      And I see a snackbar confirmation message
      And I see the correct number of *Present* and *Absent* learners

  Scenario: Coach can review a lesson report
  	Given I am signed in to Kolibri as a coach
      And I am at the *Coach > <class> > Lessons* page
      And there are completed lessons
    When I click on the title of a lesson
    Then I see the lesson details page for a lesson
  		And I see the lesson title, the *Manage resources* button and the *...* button next to it
    	And I see the side panel with *Visible to learners* status (off by default), *Recipients*, *Description*, *Class*, *Size*, *Date created*
    	And I see the *Resources* tab and *Title*, *Progress* and *Average time spent* columns for each resource
    	And I see the *Learners* tab
    When I click on a resource
    Then I see the resource progress report
    	And I see the title of the resource, class to which the resource is assigned, progress made, and average time spent
    	And I see a *View by groups* checkbox
    	And I see the learners table with *Name*, *Progress*, *Time spent*, *Groups* and *Last activity* columns
      And in the *Progress* column I see the summary icons and labels (Completed, Started, Not started, and Need help)
      And in the top right I see the *View learner devices* link, *Print report* icon, *Export as CSV* icon and a *Preview* button
    When I go back to the lesson details page
    	And I click on the *Learners* tab
    Then I see a table with the learners
    	And I see the following columns: *Name*, *Progress*, *Groups
    	And I see the progress made by each learner
    When I click on the name of a learner
    Then I see a table with all of the lesson resources and the following columns: *Title*, *Progress* and *Time spent*
    	And in the top right corner I see a *Print report* and *Export CSV* icons

  Scenario: Coach can review a quiz report
  	Given I am signed in to Kolibri as a coach
      And I am at the *Coach > <class> > Quizzes* page
      And there are assigned quizzes
      And I see a table with the assigned quizzes
      And I see the title, average score, progress, recipients, size and status of each quiz
    When I click on the title of a quiz which is in progress
    Then I see the title, description, recipients, average score, question order and size of the quiz
    	And I see options to print or export the quiz
    	And I see an *End quiz* button
    	And I see that I am on the *Learners* tab for the quiz
			And I see the *Name*, *Progress*, *Score*, *Groups* and *Last activity* columns for each learner
		When I click on the name of a learner who has completed the quiz
		Then I see the quiz report page
			And I see the status, score, questions answered correctly, time spent and attempted times information for the quiz
			And I see the answer history
		When I click the back arrow
		Then I am back at the quiz details page
		When I click the *Difficult questions* tab
		Then I see a table for the difficult questions with a *Question* and a *Help needed* columns
		When I click on the title of a question
		Then I see details for the number of attempts made on this question

  Scenario: Coach can export lesson and quiz reports
  	Given I am signed in to Kolibri as a coach
      And I am at *Coach > <class> > Lessons* page
      And there are completed lessons
    When I navigate through the available pages
    	And I click the *Export as CSV file* icon
    Then I can download and view a lesson report as a .csv file
    When I go to either the *Quizzes* or *Learners* *page
    	And I click the *Export as CSV file* icon
    Then I can download and view a report as a .csv file

  Scenario: Coach can print reports
  	Given I am signed in to Kolibri as a coach
      And I am at *Coach > <class> > Lessons* page
      And there are completed lessons
    When I navigate through the available pages
    	And I click the *Print report* icon
    Then I can print a report
    When I go to either the *Quizzes* or *Learners* *page
    	And I click the *Print report* icon
    Then I can print a report

  Scenario: Coach can view and print the picture passwords of the learners
    Given I am signed in as a class coach
      And I am at *Coach > Class home* for a specific class
      And there are learners enrolled in the class
      And the *Picture password* option is enabled at *Facility > Settings*
    When I click the *View passwords* button
    Then I see the *All passwords* page
    	And I see the *All passwords* table with *Name*, *Username* and *Password* columns
    	And I see a *Print* button
    	And I can see the picture passwords of all the learners enrolled in the class
    When I click the *Print* button
    Then I see the *Print passwords* modal
    	And I see a *Print with images* radio button selected by default
    	And I see a *Print with text only* radio button
    	And I see a preview of what I am about to print
    When I click the *Continue* button
    Then I can preview the generated document
    	And I can print it

  Scenario: Learner explores the *Library* while signed in
  	Given I am signed in as a learner user
  		And there is at least one channel imported on the device
  		And there are other connected devices in the network
    When I go to *Learn > Library*
    Then I see both *Your library* and the *Other libraries* sections
    	And I see my imported channels in *Your library*
    	And I see the channels imported on devices in my network in the *Other libraries* section
    When I click on the channel card of a channel from *Your library* section
    Then I am at the channel page
    	And I can see and explore all of the available resources
    	And I can search for a resource by entering a keyword or applying a filter
    When I close the channel page
    Then I am back at *Learn > Library*
    When I click on a channel card of a channel from the *Other libraries* section
    Then I am at the channel page
    	And I can see and explore all of the available resources
    	And I can search for a resource
    When I close the channel page
    Then I am back at *Learn > Library*

  Scenario: Learner can filter resources at the *Library* page
  	Given I am signed in as a learner user
  		And I am at *Learn > Library*
  		And there is at least one channel imported on the device
  		And there are other connected devices in the network
    When I type a keyword in the *Find something to learn* field
    Then I see the available search results for the entered keyword
    When I click on a resource card
    Then I can see and interact with the resource
    When I click the back arrow
    Then I can see the same search results as before
    When I select any of the available filters such as filter by category, by activity type, language, channel or accessibility
    Then I see only results matching the applied filter(s)
    When I click on *Clear all*
    Then I see the *Your library*, *Recent* and *Other libraries* sections

  Scenario: Learner explores the *Library* while not being signed in
  	Given I am not signed in
  		And the option *Explore without account* is visible at the *Sign in* page
  		And there are channels downloaded on the device
    When I click the *Explore without account* link
    Then I am at *Learn > Library*
    	And I see all of the available filters to the left
    	And I see my imported channels in *Your library*
    	And I don't see the *Other libraries* section

  Scenario: Learner explores the *Home* page
  	Given I am signed in as a learner user assigned to a class
  		And there are imported channels on the device
  		And I have already completed some lessons an quizzes
  		And I have interacted with resources
  	When I go to *Learn > Home*
  	Then I see the *Your classes* section at the top of the page
  		And I see the *Continue learning on your own*, *Recent lessons*, *Recent quizzes* and *Explore channels* sections

  Scenario: Learner explores the *Bookmarks* page
  	Given I am signed in as a learner user assigned to a class
  		And there are imported channels on the device
  		And I have already bookmarked some resources
  	When I go to *Learn > Bookmarks*.
  	Then I see all of my bookmarked resources
  		And I can see the most recently bookmarked resource at the top of the page
  	When I click the *i* icon on a card
  	Then I can see the information for the resource
  	When I click the *x* icon on a card
  	Then the card disappears
  		And I see a *Removed from bookmarks* snackbar message
  	When I remove all of the available bookmarks
  	Then I see *You have no bookmarked resources*

  Scenario: Learner explores the *My downloads* page
  	Given I am signed in as a learner user
  		And there are other connected devices in the network
  		And a super admin has enabled the *Allow learners to download resources* at *Device > Settings*
  	When I go to *My downloads*
  	Then I see *You do not have any resources downloaded*
  		And I see information for the total size of my downloads and the available storage
  		And I see filter for *Activity type* and a *Sort by* drop-down
  	When I go to *Learn > Library > Other libraries*
  		And I click on a channel card
  		And I open the contents of a folder with resources
  	Then I see all of the available resource cards
  		And I see a *Download* icon at the lower right corner of each card
  	When I click on the *Download* icon
  	Then I see a *Download requested Go to downloads* snackbar message
  	When I click on *Go to downloads*
  	Then I am at *My downloads* page
  		And I can see the downloaded resources
  		And I can see the *Name*, *File size*, *Date added* and *Status* of each resource
  		And I can see a *View* and a *Remove* button next to each resource
  	When I filter by *Activity type*
  	Then I only see resources matching the applied filter
  	When I click the *Sort by* drop-down
  		And change the default value
  	Then I see that the available resources are sorted by the applied criteria
  	When I click on the *View* button next to a resource
  	Then I am able to view and interact with the resource
  	When I click the *Go back* arrow
  	Then I am back at *My downloads* page
  	When I click the *Remove* button next to a resource
  	Then I see the *Remove from library* modal window
  	When I click *Remove*
  	Then the resource is removed from the list with downloaded resources

  Scenario: Learner explores the *Profile* page
  	Given I am signed in as a learner user
  		And the facility is set up to allow learners to edit full names, usernames and passwords
  	When I expand the sidebar
  		And I click *Profile*
  	Then I am at the *Profile* page
  		And I can see the following fields: *Points*, *User type*, *Full name*, *Username*, *Gender*, *Birth year*, *Password - Change password*
  	When I click the *Edit* button
    Then I see the *Edit profile* page
    When I change my full name, username, gender and birth year
  	  And I click the *Save* button
    Then I see a *Changes saved* snackbar message
	    And I see the new full name, username, gender and birth year
	  When I click the *Change password* button
	  Then I see the *Change password* modal
	  When I enter a new password
	    And I re-enter the new password
	    And I click the *Update* button
	  Then I see a *Your password has been changed* snackbar message

  Scenario: Learner can change the UI language
  	Given I am signed in as a learner user
  	When I open the sidebar
  		And I click on *Change language*
  	Then I see the *Change language* modal
  	When I select a new language
  		And I click the *Confirm* button
  	Then I see the UI changed to the selected language
  	When I expand the sidebar
  		And I click on *Sign out*
  	Then I am at the *Sign in* page
  		And I see the Sign in* page in the previously selected language
  	When I select a new language from the language bar in the footer
  	Then the UI is changed to the selected language

  Scenario: Super admin can import a learning facility
  	Given I am signed in as a super admin
			And I am at *Device > Facilities*
		When I click the *Import learning facility* button
		Then I see the *Select device* modal
			And I see a list of peer devices
			And I see the network address of each device
		When I select a device
			And I click *Continue*
		Then I see the *Select learning facility* modal
			And I see one or more facilities on that device
		When I select a facility
			And I click *Continue*
		Then I see the *Enter admin credentials* modal
		When I enter the username and the password of a facility admin or a super admin for the facility
			And I click *Continue*
		Then I see the *Facilities - Task manager* page
			And I see that the import task is in progress
		When the import has finished
			And I close the *Facilities - Task manager* page
		Then I see the imported facility in my *Facilities* list

	Scenario: Super admin can sync an imported learning facility to a peer device
		Given I am signed in as a super admin
			And I am at *Device > Facilities*
			And I have imported a learning facility
			And I am connected to that learning facility
		When I click the *Sync* button next to an imported facility
			Then I see the *Select a source* modal
		When I select *Local network or internet*
			And I click *Continue*
		Then I see the *Select device* modal
			And I see a list of devices that also have my facility
		When I select a device
			And I click *Continue*
		Then I see a task progress bar above the list with facilities
			And I see a *Syncing* message under the facility
			And I see an indeterminate spinner
		When the facility is done syncing
			Then I see a message under the facility: *Last synced: just now*

	Scenario: Super admin can register and sync a facility to Kolibri Data Portal
		Given I am signed in as a super admin
			And I am at *Device > Facilities*
		When I click the *Sync* button next to an imported facility
		Then I see the *Select a source* modal
		When I select *Kolibri data portal (online)*
			And I click *Continue*
		Then I see the *REgister facility* modal
			And I see the *Project token* field
		When I enter a valid project token
			And I click *Continue*
		Then I see the *Select a source* modal
			And I see *Register with <project_name>? Data will be saved in the cloud*
		When I click *Register*
		Then I see a task progress bar above the list with facilities
			And I see a *Syncing* message under the facility
			And I see an indeterminate spinner
		When the facility is done syncing
			Then I see a message under the facility: *Last synced: just now*

  Scenario: Super admin can change the device settings
  	Given I am signed in as a super admin
			And I am at *Device > Settings*
		When I change any of the available settings such as default language, external devices, default landing page, primary storage location, auto-download and enabled pages
			And I click *Save changes*
		Then I can see a *Settings have been updated* snackbar message

  Scenario: Super admin can change the device permissions
  	Given I am signed in as a super admin
			And I am at *Device > Permissions*
			And there is a facility user who does not have device permissions
		When I click *Edit permissions* button for the user
     Then I see the *Permissions* page
      And I can see the username, user type and facility of the user
    When I select the *Make super admin* checkbox
    Then I see that the checkbox under *Device permissions* is checked and disabled
      And the *Save changes* button becomes active
    When I click *Save changes*
    Then I see the confirmation snackbar *Changes saved*
    When I click on *Edit permissions* next to the user
    Then I see that the *User type* is now *Super admin*
      And I see the *Make Super admin* checkbox is checked but not disabled
      And I see the *Save changes* button is disabled

  Scenario: Super admin can see the device info and change the device name
  	Given I am signed in as a super admin
		When I go to *Device > Info*
		Then I see the correct info for the following: Server URL, Free disk space, Kolibri version and Device name
			And I see the Advanced section
		When I click the *Show* link
		Then I see advanced info for the version, OS, Python, installer, server, database, free disk space, server time, server timezone, device id
			And I see a *Copy to clipboard* button
		When I click *Edit* next to the device name
    Then I see the *Device name* modal
    When I enter a new name
    	And I click *Save*
    Then I see the new device name
      And I see a snackbar that says *Changes saved*

  Scenario: Admin can change the facility settings
  	Given I am signed in as an admin
  	When I go to *Facility > Settings*
  	Then I can see the facility name
  		And I can see the following checkboxes: Allow learners to edit their username, Allow learners to edit their full name, Allow learners to create accounts, Allow coaches to take attendance (English only), Show 'download' button with resources
  		And I can see the *How learners sign in* section with the following radio-buttons: Enter username and password, Enter username only, Picture password, Child-friendly icons, Standard icons, Show icon names
  		And I can see the *Device management PIN* section with a *Create PIN* button
  	When I select or deselect any of the available options
  		And I click the *Save changes* button
  	Then I see the *Facility settings updated* snackbar message
  	When I click the *Create PIN* button
  	Then I see the *Create device management PIN* modal
  	When I enter a valid PIN
  		And I click *Save*
  	Then I see the *New PIN created* snackbar message
  		And I see an *Options* drop-down at the place of the *Create PIN* button
  	When I click on the *Options* drop-down
  	Then I see the following options: View PIN, Change PIN, Remove PIN
  	When I click the *Remove PIN* option
  	Then I see the *Remove device management PIN* modal
  	When I click the *Remove PIN* button
  	Then I see the *PIN removed* snackbar message

  Scenario: Admin can export usage data
  	Given I am signed in to Kolibri as an admin
      And I am at *Facility > Data* page
      And learners have interacted with content on the device
    When I click on the *Generate log* button under *Session logs* heading
    Then I see the *Select a date range* modal
    When I select a start and an end date
    	And I click *Generate*
    Then I see a *Download* button displayed to the left of the *Generate log* button
    When I click on the *Download* button
    Then I see the *Open/Save as* window, or the file 'content_session_logs.csv' is automatically saved on my local drive, depending on the browser defaults
    When I click on the *Generate log* button under *Summary logs* heading
    Then I see the *Select a date range* modal
    When I select a start and an end date
    	And I click *Generate*
    Then I see a *Download* button displayed to the left of the *Generate log* button
    When I click on the *Download* button
    Then I see the *Open/Save as* window, or the file 'content_session_logs.csv' is automatically saved on my local drive, depending on the browser defaults

  Scenario: Admin can import and export users
  	Given I am signed in to Kolibri as an admin
      And I am at *Facility > Data* page
    When I click the *Import* button under *Import and export users* heading
    Then I see the *Import users from spreadsheet* page with a text explaining the consequences of importing
    When I click the *Choose file* button
      And I select a CSV file with the right format
    Then I see the *Continues* button is now enabled
    When I click the *Continue* button
    Then I see the *Import users* page
      And I see the loading indicator
    When the file is processed
    Then I see a list of the users and classes that are going to be updated and created
      And I see the list of errors, if any
      And I see the *Back* and *Import* buttons
    When I click the *Import* button
    Then I see the *The import succeeded* message
      And I see a report with the changes made in the database
    When I click *Close* button
    Then I am back at *Facility > Data*
    When I click *Generate user CSV file*
    Then the *Download CSV* button gets enabled
    When I click *Download CSV*
    Then I see the *Open/Save as* window, or the file 'facility_name_users.csv' is automatically saved on my local drive, depending on the browser defaults

  Scenario: Admin can sync facility data to KDP or another Kolibri server
  	Given I am signed in to Kolibri as an admin
      And I am at *Facility > Data* page
      And my facility is already registered to KDP
      And there is another active Kolibri server in the network
    When I click the *Sync* button
    Then I see the *Select a source* modal
    When I select one of the available options
    	And I click *Continue*
    Then I see a *Syncing* message under the facility
			And I see an indeterminate spinner
		When the facility is done syncing
			Then I see a message under the facility: *Last synced: just now*

  Scenario: Admin can reset the password of a user
  	Given I am signed in to Kolibri as an admin
  		And the *Enter username and password* option is enabled at *Facility > Settings*
      And I am at *Facility > Users* page
    When I click on the *Options* drop-down next to a user
      And I select the *Reset password* option
    Then I see the *Reset user password* modal
    When I fill in the *Password* and *Re-enter password* fields
      And I click the *Save* button
    Then the modal closes
      And I see the *Password reset* snackbar message
