Feature: Change facility after device setup

	Background:
    Given I’ve set up my Kolibri device with the *On my own* device setup option
			And I am signed in
			And I am at the *Profile* page

	Scenario: Change learning facility - default path
		When I click the *Change* button
		Then I see *Select* facility
			And I see a list with facilities
			And I see that the first facility in the list is selected
			And I see an *Add new address* link
		When I click *Continue*
		Then I see a *Change learning facility* label
			And I see *You are about to move your account and progress data to ‘<facility>’ learning facility. Your current data will still be available to you and will also be accessible to any administrators of this learning facility. Your account type will change from ‘[non-learner-role] to ‘learner’ and you will no longer be able to manage resources on this device. You will need someone with admin permissions in ‘<facility>’ to change your account type back to 'superuser'. You can also search for an account in ‘<facility>’ to merge with. Progress data from both accounts will be combined into one account.*
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
		Then I am at the *Home* page
			And I am signed in

	Scenario: Change learning facility by manually adding the facility address
		Given I am at the *Select facility* page
		When I click *Add new address*
		Then I see the *Select network address* modal
					And I can input a valid network address
					And I can proceed with the facility change by following the onscreen instructions

	Scenario: Change learning facility by creating a new account
		Given I am at *Confirm account username*
		When I click *Create new account*
		Then I see the *Create new account page*
			And I see a form with the following fields: *Full name*, *Username*, *Password* and *Re-enter password* # *Password* and *Re-enter password* should be hidden if facility doesn’t require password
			And I see a *Usage and privacy* link
		When I fill in all the fields
			And I click *Continue*
		Then I see a *Changing learning facility* label
			And I see a progress bar
		When the process has finished
		Then I see a *Changing learning facility* label
			And I see a green check icon and a *Finished* label
			And I see *Successfully joined '<facility>' learning facility*
		When I click *Finish*
		Then I am at the *Home* page
			And I am signed in

	Scenario: Change learning facility by creating a new account with existing username and password
		Given I am at *Merge account*
			And both username and password exist
		Then I’m on the *MConfrim account details* page
			And I can see the full name, username, identifier, gender and birth year values for the account
		When I click *Continue*
		Then I see a *Merge accounts* label
			And I see: *You are about to merge two accounts and their progress data. Progress data includes your interactions with resources, time spent, and points. This cannot be undone.*
			And I see a checkbox *I understand the consequences of merging accounts*
		When I select the checkbox
			And I click *Continue*
		Then I can proceed with the process of merging the accounts by following the onscreen instructions

	Scenario: Change learning facility by creating a new account with existing username and not existing password
		Given I am at *Merge account*
		And the username already exists
		But the password doesn’t exist
		When I click the *Use an admin account* link
		Then I see a *Merge accounts* label
			And I can see my full name and my username
			And I see: *Enter the username and password of a facility admin or a super admin for '<facility>' learning facility.
			And I see a *Username* and a *Password* field to enter the credentials of a facility admin or a super admin for  '<facility>'
		When I fill in the *Username* and *Password* fields
			And I click *Continue*
		Then I’m on the *Confirm account details* page
			And I can see the full name, username, identifier, gender and birth year values for the account
		When I click *Continue*
		Then I can proceed with the process of merging the accounts by following the onscreen instructions

	Scenario: Merge user account with an account in the new facility
		Given I am at the *Change learning facility* page
		When I click *Merge accounts*
		Then I am at the *Merge accounts* page
			And I see my full name and username
			And I see: *Enter the username of the account you want to merge your account into.*
			And I see a *Username* field where I can enter the username of the account I want to merge my account into
		When I enter a username
		Then I am at the *Merge accounts* page
			And I see my full name and username
			And I see: *Enter the password of the account '<username>' in '<facility>' learning facility that you want to merge your account with.*
			And I can see a *Use an admin account* link
		When enter the password
			And I click *Continue
		Then I’m on the *Confirm account details* page
			And I see: *Your account will be merged into this account in '<facility>'. You will need to use the username and password for this account from now on.*
			And I see the full name, username, identifier, gender and birth year values for the account
		When I click *Continue*
		Then I am at the *Merge accounts* page
			And I see: *You are about to merge two accounts and their progress data. Progress data includes your interactions with resources, time spent, and points. This cannot be undone.*
			And I see a unchecked checkbox *I understand the consequences of merging accounts*
			And I see a disabled *Continue* button
		When I select the checkbox
			And I click *Continue*
		Then I am at *Changing learning facility*
			And I see a progress bar
		When the merging has successfully finished
		Then I see the  *Finished* label
			And I see a green check icon and *Successfully joined '<facility>' learning facility*
		When I click *Finish*
		Then I am at the *Home* page
			And I am signed in

	Scenario: Merge user account without an existing password
		Given I am at the *Merge accounts* page
			And I see my full name and username
			And I see a *Username* field where I can enter the username of the account I want to merge my account into
		When I enter a username
		Then I am at the *Merge accounts* page
			And I see my full name and username
			And I see: *Enter the password of the account '<username>' in '<facility>' learning facility that you want to merge your account with.*
		When I leave the *Password* field empty
			And I click the *Use an admin account* link
		Then I can see a *Merge accounts* label
			And I see my full name and my username
			And I see a *Username* and *Password* field to enter the credentials of a facility admin or a super admin for '<facility>'
		When I fill in the *Username* and *Password* fields
			And I click *Continue*
		Then I’m on *Confirm account details* page
			And I see the full name, username, identifier, gender and birth year values for the account
		When I click *Continue*
		Then I can proceed with the process of merging the accounts by following the onscreen instructions
