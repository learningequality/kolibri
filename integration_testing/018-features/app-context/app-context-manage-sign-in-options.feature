Feature: Manage sign in options within app context
	In Kolibri running as an app, users need to be able to sign in by tapping their username on the sign in page.

	# For this testing scenario you may want to start with one facility on the device with less than 16 users, and then create or import another one.

	Background:
	  	Given Kolibri is running in app context
	  		And I am signed in to Kolibri as a super admin or a facility admin user
	    	And there are 16 or less users on the facility
	    	And that signing in without password is enabled in the *Facility Settings*

	Scenario: Sign in page displays the list of usernames
		Given there is only one facility on the device
		When I sign out and close Kolibri app
			And I tap the icon to open the Kolibri app again
		Then I see *Sign into '<facility>'*
			And I see a list of all the usernames on the sign in page

	Scenario: Learner signs in directly by taping their username (single facility)
		Given there is only one facility on the device
			And I see *Sign into '<facility>'*
		When I tap learner <learner> username
		Then I see learner <learner> *Learn > Home* page

	Scenario: Require password for learner sign in
		Given I am signed in to Kolibri as a super admin or a facility admin user
			And I am on *Facility > Settings* page
		When I uncheck the *Allow learners to sign in with no password* checkbox
			And I tap *Save changes*
			And I sign out
		Then I see a list of all the usernames on the sign in page
		When I tap learner <learner> username <username>
		Then I see another screen with a password input field
		When I type learner <learner> password <password>
			And I tap *Continue*
		Then I see learner <learner> *Learn > Home* page

	Scenario: Sign in when password is required and more than 16 users in the facility
		# create additional users for this scenario
		Given there are more than 16 users on the facility
			And I am signed out
		When I tap the Kolibri app icon
		Then I see the sign in page with a username input field
		When I type learner <learner> username <username>
			And I tap *Sign in*
		Then I see another screen with a password input field
		When I type learner <learner> password <password>
			And I tap *Continue*
		Then I see learner <learner> *Learn > Home* page

	Scenario: Enable learners to sign in without password
		Given I am signed in to Kolibri as a super admin or a facility admin user
			And there are more than 16 users on the facility
			And I am on *Facility > Settings* page
		When I check the *Allow learners to sign in with no password* checkbox
			And I tap *Save changes*
			And I sign out and close Kolibri app
		When I tap the Kolibri app icon
		Then I see the sign in page with a username input field
		When I type learner <learner> username
			And I tap *Sign in*
		Then I see learner <learner> *Learn > Home* page

	Scenario: Learner signs in directly by taping their username (multiple facilities)
		Given there is more than one facility on the device
			And that signing in without password is enabled in the *Facility Settings*
			And <facility> has less then 16 users
			And I see *Sign in if you have an existing account*
		When I tap the *Sign in* button
		Then I see the list of facilities
		When I tap the <facility> button
		Then I see a list of all the usernames
		When I tap learner <learner> username
		Then I see learner <learner> *Learn > Home* page

	Scenario: Sign in when password is required and more than 16 users in the facility (multiple facilities)
		Given there is more than one facility on the device
			And that signing in without password is disabled in the *Facility Settings*
			And <facility> has more then 16 users
			And I see *Sign in if you have an existing account*
		When I tap the *Sign in* button
		Then I see the list of facilities
		When I tap the <facility> button
		Then I see the the username input field
		When I type learner <learner> username <username>
			And I tap *Next*
		Then I see the password input field
		When I type learner <learner> password <password>
			And I tap *Sign in*
		Then I see learner <learner> *Learn > Home* page

	Scenario: Any subsequent session on Kolibri after first sign in (single facility; with password; less then 16 users)
		Given the device has only one facility
			And I have used this device previously to sign in or create a new learner account
			And that signing in without password is disabled in the *Facility Settings*
		When I tap the app icon to open Kolibri
		Then I see *Sign into '<facility>'*
			And I see a list of usernames
		When I tap my <username>
		Then I see *Sign into '<facility>' as '<username>'*
			And I see the input field for entering my password
			And I type my password
			And I click on *Sign in*
		Then I see my *Learn > Home* page

	Scenario: Any subsequent session on Kolibri after first sign in (multiple facilities; with password; less then 16 users)
		Given the device has multiple facilities
			And I have used this device previously to sign in or create a new learner account
			And that signing in without password is disabled in the *Facility Settings*
		When I tap the app icon to open Kolibri
		Then I see the *Select facility...*
			And I see a list of facilities
		When I tap to select <facility>
		Then I see *Sign into '<facility>'*
			And I see a list of usernames
		When I tap my <username>
		Then I see *Sign into '<facility>' as '<username>'*
			And I see the input field for entering my password
			And I type my password
			And I click on *Sign in*
		Then I see my *Learn > Home* page

	Scenario: Facility name will not be displayed on the sign in page if there is only one facility on the device and the use context is personal
 		Given I have a Kolibri account
			And there is only one facility on the device
			And the use context is personal
		When I tap the app icon to open Kolibri
		Then I see a list of usernames
			And I don't see any facility name displayed in the sign in container box
			And I tap on my username
		Then see the input field for entering my password
			And I type my password
			And I click on the *Next* button
		Then I see my Kolibri account

	Scenario: Facility name will be displayed on the sign in page if there is only 1 facility on the device and the use context is formal / non formal
 		Given I have a Kolibri account
			And there is only 1 facility on the device
			And the use context is formal / non formal
		When I click on the Kolibri application
		Then I see a list of usernames
			And I see the facility name displayed in the container box
			And I tap on my username
		Then see the input field for entering my password
			And I type my password
			And I click on the *Next* button
		Then I see my Kolibri account

	Examples:
	| learner | username | password | facility   |
	| John C. | johnc    | johnc    | MyFacility |
