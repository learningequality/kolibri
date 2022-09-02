Feature: Import individual users

	Background:
		Given Kolibri is not installed on my device
			And the Kolibri installer is downloaded to my device
			And Kolibri version 0.15 is installed on another device in my network
			And I have a local wi-fi connection
		When I install Kolibri
			And I open Kolibri in my browser
		Then I see *Please select the default language for Kolibri*
		When I click *Continue*
		Then I see *Getting started*
		When I select *Advanced Setup*
			And I click *Continue*
		Then I see *Device name*
			And I see <My device's name>
		When I click *Continue*
		Then I see *Select a facility setup for this device*

	Scenario: See available *Select a facility setup for this device* page features
		Given I see *Select a facility setup for this device*
		Then I see the *Full device* section
			And I see the radio options *Create a new facility* and *Import all data from an existing facility*
			And I see the *Learn-only device* section
			And I see the radio option *Import one or more user accounts from an existing facility*
			And I see the caption *This device supports auto-syncing with a full device that has the same facility*
		When I hover my mouse over the tooltip next to *Full device*
		Then I see *Features for learners, coaches, and admins will be available*
		When I hover my mouse over the tooltip next to *Learn-only device*
		Then I see *Only features for learners will be available. Features for coaches and admins will not be available.*

	Scenario: Import one user when there is only one facility in the network
		Given I see *Select a facility setup for this device*
		When I select *Import one or more user accounts from an existing facility*
			And I click *Continue*
		Then I see *Select network address*
			And I see *Devices must be installed with Kolibri version 0.15.0* in the modal description
			And I see radio options for devices in my network
			And I see <Kolibri version> in the caption of each radio option
		When I select <device>
			And I click *Continue*
		Then I see *Import individual user accounts*
			And I see *Import individual user accounts - 1 of 2* in the app bar
		When I enter the <username> and <password> of <user> in <facility>
			And I click *Import*
		Then I see *Loading user*
			And I see *Import individual user accounts - 2 of 2* in the app bar
			And I see a loading bar
		When the user finishes importing
		Then I see *Finished*
			And I see *<Full name> from <facility> successfully loaded to this device*
			And I see the buttons *Finish* and *Import another user*
		When I click *Finish*
		Then I see the *Welcome to Kolibri!* modal on the *Channels* page
			And I see that I am signed in as <username>

	Scenario: Import a second user
		Given I have finished importing the user <Full name 1> to my *Learn-only device*
			And I am viewing the *Loading user* page
		When I click *Import another user*
		Then I see the *Import individual user accounts* page
			And I see a *Skip* button next to the *Import* button
		When I enter <username> and <password> of <user 2>
		Then I see the *Loading user* page
		When the user finishes importing to the device
		Then I see *Finished*
			And I see <Full name 2> from <facility> successfully loaded to this device
			And I see *On this device*
			And I see a list with <Full name 1> and <Full name 2>
		When I click *Finish*
		Then I see the *Welcome to Kolibri* modal
			And I see that I am signed in as the first user I imported

	Scenario: Change mind while importing a second user
		Given I have finished importing the user <Full name 1> to my *Learn-only device*
			And I am viewing the *Loading user* page
		When I click *Import another user*
		Then I see the *Import individual user accounts* page
			And I see a *Skip* button next to the *Import* button
		When I click *Skip*
		Then I see the *Welcome to Kolibri!* modal on the *Channels* page

	Scenario: Import coach or admin
		Given I am on the *Import individual user accounts* page
		When I enter <username> and <password> of a coach or admin user
			And I click *Import*
		Then I see the *Device limitations* modal
		When I click *Import*
		Then I see the *Loading user* page

	Scenario: Use an admin account
		Given I am on the *Import individual user accounts* page
		When I click *Use an admin account*
		Then I see *Select a user*
			And I see a user text box filter
			And I see a user table
			And I see the columns *Full name* and *Username*
			And I see *Import* buttons on each row
			And I see pagination at the bottom of the table
		When I click *Import* on <user 1>
		Then I see the *Loading user* page
		When <user 1> finishes importing to the device
		Then I see *Finished*
			And I see <Full name 1> from <facility> successfully loaded to this device
		When I click *Import another user*
		Then I see *Select a user*
			And I see the user table
			And I see that the row for <user 1> is grayed out
			And I see *Imported* instead of the *Import* button for <user 1>
			And I see a bottom bar with a secondary *Skip* button
		When I click *Import* for <user 2>
		Then I see *Loading user*
		When <user 2> finishes importing to the device
		Then I see *Finished*
			And I see <Full name 2> from <facility> successfully loaded to this device
			And I see *On this device*
			And I see a list with <Full name 1> and <Full name 2>

	Scenario: Change mind while importing a second user while using an admin account
		Given I have finished importing the user <Full name 1> to my *Learn-only device*
			And I imported them using an admin account
		When I click *Import another user*
		Then I see *Select a user*
			And I see a bottom bar with a secondary *Skip* button
		When I click *Skip*
		Then I see the *Welcome to Kolibri* modal on the *Channels* page

	Scenario: Import coach or admin while *Require password for learners* facility setting is disabled
		Given I am viewing *Import individual user accounts*
			And <facility> has disabled the facility setting *Require password for learners*
		Then I see the *Username* text field
			And I do not see the *Password* text field
		When I enter the username <username> of a coach or admin from <facility>
		When I click *Import*
		Then I see the modal *Enter password*
			And I see *Please enter the password for <username>
			And I see *<Full name> (<username>) is a <coach or admin> on <peer device>. This device is limited to features for learners only. Features for coaches and admins will not be available.*
			And I see a *Password* text field
		When I enter <password> for <username>
		When I click *Import*
		Then I see the *Loading user* page
			And I see the user import is in progress

	Scenario: Import coach or admin after using an admin account
		Given I am on the *Import individual user accounts* page
		When I click *Use an admin account*
		Then I see the *Select a user* page
		When I click *Import* for <user>
			And <user> is a coach or admin
		Then I see the *Device limitations* modal
		When I click *Import*
		Then I see the *Loading user* page
