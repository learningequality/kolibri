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
		Then I see a *Change facility* label
			And I see *You are about to move your account and progress data to ‘<facility>’. Your data will still be available to you and will also be accessible to any administrators of this facility. Your user type will change from ‘[non-learner-role] to ‘learner’. You will need an admin to make you a(n) ‘[non-learner-role]’ again. You can also search for an account to merge with in ‘<facility>’. Progress data from both accounts will be combined into one account.*
			And I see a *Merge accounts* option
		When I click *Continue*
		Then I see a *Confirm account username* label
			And I see: *Yoa are about to join ‘<facility>’ as ‘<username>’. You can continue using this username or create a new account username for <facility>*
			And I see a *Create new account* option
		When I click *Continue*
		Then I see a *Choose a new admin* label #shown only if the user is the only super admin
			And I see a list with available accounts to manage channels and accounts
			And I see a disabled *Continue* button
			And I see a *Back* button
		When I select an admin
			And I click *Continue*
		Then I see a *Changing facility* label
			And I see a progress bar
		When the process has finished
		Then I see a *Changing facility* label
			And I see a green check icon and a *Finished* label
			And I see *Successfully joined '<facility>'*
		When I click *Finish*
		Then I am at the *Home* page
			And I am signed in

	Scenario: Change learning facility by manually adding the facility address
		Given I am at the *Select facility* page
		When I click *Add new address*
		Then I see the *Select network address* modal
					And I can select a network address
					And I can proceed with the facility change by following the onscreen instructions

	Scenario: Change learning facility by creating a new account
		Given I am at *Confirm account*
		When I click *Create new account*
		Then I see the *Create new account page*
			And I see the a form with the following fields: *Full name*, *Username*, *Password* and *Re-enter password* # *Password* and *Re-enter password* should be hidden if facility doesn’t require password
			And I see a *Usage and privacy* link
		When I fill in all the fields
			And I click *Continue*
		Then I see a *Changing facility* label
			And I see a progress bar
		When the process has finished
		Then I see a *Changing facility* label
			And I see a green check icon and a *Finished* label
			And I see *Successfully joined '<facility>'*
		When I click *Finish*
		Then I am at the *Home* page
			And I am signed in

	Scenario: Change learning facility by creating a new account with existing username and password
		Given I am at *Merge account*
			And both username and password exist
		Then I’m on the next *Merge accounts* page
			And I can choose which account information I want to use in the ‘<facility>’ facility
			And I can see the full name, username, identifier, gender and birth year values for each account
		When I click *Continue*
		Then I can proceed with the process of merging the accounts by following the onscreen instructions

	Scenario: Change learning facility by creating a new account with existing username and not existing password
		Given I am at *Merge account*
		And the username already exists
		But the password doesn’t exist
		When I click the *Use an admin account* link
		Then I can see a *Merge accounts* label
			And I can see my full name and my username
			And I can see a *Username* and *Password* field to enter the credentials of a facility admin or a super admin for  '<facility>'
		When I fill in the *Username* and *Password* fields
			And I click *Continue*
		Then I’m on the next *Merge accounts* page
			And I can choose which account information I want to use in the ‘<facility>’ facility
			And I can see the full name, username, identifier, gender and birth year values for each account
		When I click *Continue*
		Then I can proceed with the process of merging the accounts by following the onscreen instructions

	Scenario: Merge user account with the account in the new facility
		Given I am at the *Change facility* page
		When I click *Merge accounts*
		Then I am at the *Merge accounts* page
			And I can see my full name and username
			And I can see a *Username* field where I can enter the username of the account I want to merge my account into
			And I can see a *Use an admin account* link
		When I enter a username
			And I click *Continue
		Then I’m on the next *Merge accounts* page
			And I can choose which account information I want to use in the ‘<facility>’ facility
			And I can see the full name, username, identifier, gender and birth year values for each account
		When I click *Continue*
		Then I am at the *Confirm account details* page
			And I can see the full name, username, identifier, gender and birth year of the user
			And I can see an *Edit account details* link
			And I can see a *Enter password* and *Re-enter password* fields
		When I fill in the *Enter password* and *Re-enter password* fields
			And I click *Continue*
		Then I see a *Choose admin* label #shown only if the user is the only super admin
			And I see a list with available accounts to manage channels and accounts
			And I see a disabled *Continue* button
			And I see a *Back* button
		When I select an admin
			And I click *Continue*
		Then I am at the *Merge accounts* page
			And I can see text informing me that I am about to merge all progress data from two different accounts
			And I can see a unchecked checkbox *I understand the consequences of merging accounts*
			And I see a disabled *Continue* button
		When I select the checkbox
			And I click *Continue*
		Then I see a progress bar
		When the merging has successfully finished
		Then I see the  *Merging accounts* label
			And I see a green check icon and a *Finished* label
			And I see *Successfully joined '<facility>'* as ‘<theirfullname>’
		When I click *Finish*
		Then I am at the *Home* page
			And I am signed in

	Scenario: Merge user account without an existing password
		Given I am at the *Merge accounts* page
			And I can see my full name and username
			And I can see a *Username* field where I can enter the username of the account I want to merge my account into
			And I can see a *Use an admin account* link
		When I enter a username
			And I click the *Use an admin account* link
		Then I can see a *Merge accounts* label
			And I can see my full name and my username
			And I can see a *Username* and *Password* field to enter the credentials of a facility admin or a super admin for  '<facility>'
		When I fill in the *Username* and *Password* fields
			And I click *Continue*
		Then I’m on the next *Merge accounts* page
			And I can choose which account information I want to use in the ‘<facility>’ facility
			And I can see the full name, username, identifier, gender and birth year values for each account
		When I click *Continue*
		Then I can proceed with the process of merging the accounts by following the onscreen instructions
