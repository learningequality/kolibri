Feature: Manage sign in options within app context
	In Kolibri running as an app, users need to be able to sign in by tapping their username on the sign in page.

	Background:
	  Given Kolibri is running in app context
	  	And I am signed in to Kolibri as a super admin or a facility admin user
	    And there are 16 or less users on the facility
	    And that signing in without password is enabled in the *Facility Settings*

	Scenario: Sign in page displays the list of usernames
		When I sign out and close Kolibri app
			And I tap the icon to open the Kolibri app again
		Then I see a list of all the usernames on the sign in page

	Scenario: Learner signs in directly by taping their username
		When I tap learner <learner> username
		Then I see learner <learner> *Learn* page

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
		Then I see learner <learner> *Learn* page

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
		Then I see learner <learner> *Learn* page

	Scenario: Enable learners to sign in without password
		Given I am signed in to Kolibri as a super admin or a facility admin user
			And there are more than 16 users on the facility
			And I am on *Facility > Settings* page
		When I check the *Allow learners to sign in with no password* checkbox
			And I tap *Save changes*
			And I sign out and close Kolibri app
		When I tap the Kolibri app icon
		Then I see the sign in page with a username input feild
		When I type learner <learner> username
			And I tap *Sign in*
		Then I see learner <learner> *Learn* page

	Examples:
	| learner | username | password |
	| John C. | johnc    | johnc    |
