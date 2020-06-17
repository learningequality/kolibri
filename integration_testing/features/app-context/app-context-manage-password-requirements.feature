Feature: Manage password requirements in app context
	In app context password may not be required to sign in or create accounts.

	Background:
		Given that I am signed in as superadmin or facility admin
			And I am on the *Facility > Settings* page

	Scenario: Learners cannot change password when it is not required to sign in
		When I see that the facility setting *Require password for learners* is unchecked
		Then I see that the nested setting *Allow learners to change their password when signed in* is disabled (grayed out)

	Scenario: Users are not required to input password when creating accounts
		Given that the facility setting *Require password for learners* is unchecked
			And I am signed out
		When I open Kolibri app
			And I tap *Create account*
		Then I only see the input fields for *Username* and *Fullname*
			But I don't see the *Password* and *Re-enter password* fields

	Scenario: Password is not required when admins create user accounts
		Given that the facility setting *Require password for learners* is unchecked
			And I am signed in as superadmin or facility admin
			And I am on the *Facility > Users* page
		When I tap *New user*
		Then I am on *Create new user* modal
			And I see see the input fields for *Username* and *Fullname*
			But I don't see the *Password* and *Re-enter password* fields

	Scenario: Learners do not see option to change password
		Given that the facility setting *Require password for learners* is unchecked
			And I am signed in as a learner
		When I tap on my username on the top right corner
			And I tap *Profile*
		Then I see the details of my profile
			But I don't see the option *Change password*

	Scenario: Learners can change password when it is required to sign in
		Given that the facility setting *Require password for learners* is unchecked
			And *Allow learners to change their password when signed in* is disabled (grayed out)
			And I am signed in as superadmin or facility admin
		When I check the setting *Require password for learners*
		Then see that the nested setting *Allow learners to change their password when signed in* is enabled

	Scenario: Users are required to input password when creating accounts
		Given that the facility setting *Require password for learners* is checked
			And I am signed out
		When I open Kolibri app
			And I tap *Create account*
		Then I see the input fields for *Username*, *Fullname*, *Password* and *Re-enter password*

	Scenario: Password is required when admins create user accounts
		Given that the facility setting *Require password for learners* is checked
			And I am signed in as superadmin or facility admin
			And I am on the *Facility > Users* page
		When I tap *New user*
		Then I am on *Create new user* modal
			And I see see the input fields for *Username*, *Fullname*, *Password* and *Re-enter password*

	Scenario: Learners can see the option to change password
		Given that the facility setting *Require password for learners* is checked
			And I am signed in as a learner
		When I tap on my username on the top right corner
			And I tap *Profile*
		Then I see the details of my profile
			And I see the option *Change password*

	Scenario: Password creation for learners who did not set one when their account was created
		Given that the facility setting *Require password for learners* is checked
			And I have a learner account
			And my account was created without the password
		When I open Kolibri app
			And I tap/type my username
		Then I see and input fields to type a new password and retype the same
		When I type my password
			And I click or tap *Continue*
		Then I see my Kolibri account
