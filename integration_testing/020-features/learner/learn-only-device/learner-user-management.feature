Feature: Learner on a LOD can import and remove users

  Background:
    Given I am signed in as a learner on a learn-only device (LOD)
    	And there is a Kolibri server in the network
    	And I am at *Device > Users*

	Scenario: Learner can import a user
		When I click the *Import user* button
		Then I see the *Select device* modal
		When I select a device
			And I click *Continue*
		Then I am at *Import user*
			And I see *Enter the user credentials of the account you want to import.*
			And I see a *Username* and a *Password* field
			And I see *Don't have the user credentials? Use an admin account*
			And the *Continue* button is disabled
		When I enter a valid username and password
			And I click *Continue*
		Then I am back at *Facility > Users* page
			And I see the name of the newly added learner
			And I see a spinning icon
 		When the learner has been imported successfully
		Then I see a *Successfully imported user* snackbar message
			And I see a *Remove* button next to the name of the user
		When I sign out
			And I sign in with the credentials of the imported user
		Then I am successfully signed in as the imported user

	Scenario: Learner can import a user by using an admin account
		Given I am already at the *Import user* page
			And I see *Enter the user credentials of the account you want to import.*
			And I see a *Username* and a *Password* field
			And I see *Don't have the user credentials? Use an admin account*
			And the *Continue* button is disabled
		When I click the *Use an admin account* link
		Then I see the *Use an admin account* modal
		When I enter the valid admin credentials
			And I click *Continue*
		Then I see the *Select a user* page
			And I see a table with the available users for import
		When I click the *Import* button for a user
		Then I am back at the *Facility > Users* page
			And I see the name of the newly added learner
			And I see a spinning icon
 		When the learner has been imported successfully
		Then I see a *Successfully imported user* snackbar message
			And I see a *Remove* button next to the name of the user
		When I sign out
			And I sign in with the credentials of the imported user
		Then I am successfully signed in as the imported user

	Scenario: Learner can remove a user
		Given I've already imported some users
		When I go to *Device > Users*
			And I click the *Remove* button for a user
		Then I see the *Remove user* modal
			And I see the following info text: If you remove this user from this device you will still be able to access their account and all their data on the server.
			Please ensure that all data you would like to keep has been synced before removing this user. You will permanently lose any data that has not been synced.
		When I click the *Remove user* button
		Then I am back at *Facility > Users* page
			And I see a *Successfully imported user* snackbar message
			And I no longer see the name of the removed learner
		When I sign out
			And I attempt to sign in with the credentials of the removed user
		Then I am not able to signed in as the removed user

	Scenario: Learner cannot remove the signed in *Super admin* learner user
		Given I am at *Device > Users*
			And I am signed in as the *Super admin* learner user
		When I attempt to remove that user
		Then I can see that the *Remove* button is disabled
