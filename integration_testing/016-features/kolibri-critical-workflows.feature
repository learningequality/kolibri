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

  Scenario: *On my own* setup
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
  				And a coach has enrolled the learner to a class and assigned lesson and a quiz resources to the learner
  	When I go to the *Home* page
  		And I click on the class name
  	Then I see all the lesson and quiz resources already downloaded on my device
  	When I complete a resource
  	Then a coach is able to see the lesson and quiz completion progress at *Coach > Class home* and *Coach > Reports*
  	When a coach assigns a new lesson or a quiz
  	Then after a reasonable period of time the resources get automatically transferred to the learn-only device
  		And I am able to interact with and complete the resources
  	When I expand the sidebar
  	Then I can see sync status of my device under *Device status*
  	When I go to *Learn > Library*
  	Then I see the *Your library* section
  		And I can see all the channels containing the resources which were assigned to me and were automatically transferred to the device
  		And I can see the *Other libraries* section
  		And I can explore all the available channels there

  Scenario: Group learning - Full device - Create facility with default options
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

  Scenario: Create a learner user account
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Users*
    When I click the *New user* button
    Then I see the *Create new user* page
    When I fill in all the required fields
      And I click the *Save* button
    Then the page reloads
      And I see the the snackbar confirmation that the user has been created
      And I see that the new learner is added to the *Users* table

  Scenario: Create a class
  	Given I am signed in to Kolibri as a super admin
  	  And I am at *Facility > Classes*
    When I click the *New class* button
    Then I see the *Create new class* modal
    When I fill in the *Class name* field
      And I click the *Save* button
    Then the page reloads
      And I see the the snackbar confirmation that the class has been created
      And I see that the new class is added to the *Classes* table

  Scenario: Enroll learners to a class
      Given I am signed in to Kolibri as a super admin
  	  	And I am at *Facility > Classes*
  	  	And there are created classes
      When I click on a class
      Then I see the class page
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

  Scenario: Coach creates a new lesson for the entire class
  	Given I am signed in to Kolibri as a super admin or a coach
  	  	And I am at *Coach > Plan*
    When I click the *New lesson* button
    Then I see the *Create new lesson* modal
    When I fill in the title for the lesson
      And I fill in the description # optional
      And I click the *Save changes* button
    Then the modal closes
      And I see the lesson page
      And I see that the *Visible to learners* toggle is switched off
      And I see that there are no resources in the lesson

  Scenario: Coach adds resources to a lesson and makes it visible to learners
  	Given I am signed in to Kolibri as a super admin or a coach
  	  	And I am at *Coach > Plan > <lesson>*
  	When I click the *Manage resources* button
  	Then I am at the *Manage resources in '<lesson>'* page
  	  And I see the available content channels
  	When I click on a channel
  	Then I see the available channel resources
  	When I select one or several resources
  		And I click the *Save changes* button
  	Then I am back at the lesson page
  	  And I see the resources which I've just added to the lesson
  	When I switch on the *Visible to learners* toggle
  	Then I see the *Lesson is visible to learners* snackbar

  Scenario: Coach creates a new quiz for the entire class and starts it
  	Given I am signed in to Kolibri as a super admin or a coach
  	  	And I am at *Coach > Plan > Quizzes*
    When I click the *New quiz* button
    	And I select *Create new quiz*
    Then I see the *Create new quiz* modal
    When I fill in the title for the quiz
      And I select a quiz from the available channel resources
      And I click the *Continue* button
    Then I see the *Preview quiz* page
      And I see the lesson details, question order and questions
    When I click the *Finish* button
    Then I am back at *Coach > Plan > Quizzes*
    	And I see the newly created quiz
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then I see the *Quiz started* snackbar message

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
    	And I can search for a resource
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

  Scenario: Change language

  Scenario: View results for completed quiz

  Scenario: Create an account

  Scenario: Sign in and sign out
