Feature: Admin manages facility settings
  Admin users need to be able to change the user sign-in/up, self-edit, and content download options according to the needs of the facility

  Background:
    Given I am signed in to Kolibri as a facility admin user
      And I am at the *Facility > Settings* page
      And there are learner and coach user accounts created in the facility

  Scenario: Rename the facility
    Given I am at *Facility > Settings*
      When I click the *Edit* link next to the facility name
      Then I see the *Rename facility* modal
        And I see the following warning text: Only the facility name will be changed, and the new name will be synced and updated on other devices linked to this facility.
      When I enter a new name
        And I click the *Save* button
      Then I see a snackbar that says *Changes saved*
        And I see the new name of the facility

  Scenario: See the new facility name after syncing with another device
    Given I've changed the name of my facility
      And I've initiated a sync with another device
      And that device shares my facility
      And that device has the old name of the facility
    When the sync finishes
    Then the I see the new facility name on the other device

  Scenario: Allow and disallow full name and username edit
    Given both the *Allow learners to edit their username* and the *Allow learners to edit their full name* checkboxes are checked
    When I sign in to Kolibri in a separate browser as a learner
      And I go to the *Profile* page
      And I click the *Edit* button
    Then I see the *Edit profile* page
    	And I see that both the *Full name* and *Username* fields are editable
    When as an admin I uncheck both the *Allow learners to edit their username* and the *Allow learners to edit their full name* checkboxes
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When as a learner I sign in again to Kolibri in a separate browser
      And I go to the *Profile* page
      And I click the *Edit* button
    Then I see the *Edit profile* page
    	And I see that both the *Full name* and *Username* fields are not editable

  Scenario: Allow and disallow visitors to create accounts
    Given the *Allow learners to create accounts* checkbox is unchecked
    When I check the *Allow learners to create accounts* checkbox
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When I open Kolibri in a separate browser
    Then I see the *Create an account* button on the sign-in page
    When as an admin I check the *Allow learners to create accounts* checkbox
    And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When I open Kolibri in a separate browser
    Then I no longer see the *Create an account* button on the sign-in page

  Scenario: Allow simplified sign-in
    Given the *Require password for learners* checkbox is unchecked
    When I check the *Require password for learners* checkbox
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When as a learner I open Kolibri in a separate browser
    Then I don't see the *Password* field at the sign-in page
      And I can sign-in without a password

  Scenario: Allow and disallow password change
    Given both the Require password for learners* and *Allow learners to change their password when signed in* checkboxes are checked
    When as a learner I sign in to Kolibri in a separate browser
      And I go to the *Profile* page
    Then I can see the *Change password* link
    When as an admin I uncheck the *Allow learners to change their password when signed in* checkbox
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    WWhen as a learner I sign in to Kolibri in a separate browser
      And I go to the *Profile* page
    Then the *Change password* link is no longer visible

  Scenario: Allow and disallow content download
    Given the *Show 'download' button with content* checkbox is checked
    When as a learner I sign in to Kolibri in a separate browser
      And I go to the *Learn > Library*
      And I open a single resource
      And I click the *View information* icon
    Then I see the *Save to device* button
    When as an admin I uncheck the *Show 'download' button with content* checkbox
      And I click the *Save changes* button
    Then I see the *Facility settings updated* snackbar message
    When as a learner I sign in to Kolibri in a separate browser
      And I go to the *Learn > Library*
      And I open a single resource
      And I click the *View information* icon
    Then I no longer see the *Save to device* button

  Scenario: Create a PIN
		Given there's no existing PIN
		When I click *Create PIN*
		Then I see the *Create device management PIN* modal
			And I see *You will need to sync this device with other devices with the same facility in order to use this PIN. Choose a 4-digit number to set as your new PIN*
		When I enter four numbers
			And I click *Save*
		Then the modal is closed
			And I see a toast message *New PIN created*
		When I sign in as a learner on a learn-only device
			And I go to the *Device* page
		Then I see the *Enter PIN* modal
		When I enter the correct PIN
			And I click *Continue*
		Then I can see the *Device* page

	Scenario: PIN validation
		Given there's no existing PIN
		When I click *Create PIN*
			And I enter non-numeric input such as "abcd"
		Then I see the field colored in red
			And I see *Enter numbers only*
		When I enter not enough digits such as "12"
		Then I see the field colored in red
			And I see *Must enter 4 numbers*

	Scenario: View PIN
		Given the user has already created a PIN
		When I click the *Options* dropdown
		Then I see the options *View PIN*, *Change PIN* and *Remove PIN*
		When I click *View PIN*
		Then I see the *Device management PIN* modal
			And I can see the PIN
		When I click *Close*
		Then the modal is closed
			And I am at *Facility > Settings*

	Scenario: Change PIN
		Given the user has already created a PIN
		When I click the *Options* dropdown
		Then I see the options *View PIN*, *Change PIN* and *Remove PIN*
		When I click *Change PIN*
		Then I see the *Change device management PIN* modal
			And I see *You will need to sync this device with other devices that have the same facility in order to use this PIN. Choose a 4-digit number to set as your new PIN*
		When I enter new a valid 4-digit PIN
			And I click *Save*
		Then the modal is closed
			And I see a toast message *PIN updated*
		When I sign in as a learner on a learn-only device
			And I go to the *Device* page
		Then I see the *Enter PIN* modal
		When I enter the new PIN
			And I click *Continue*
		Then I can see the *Device* page

	Scenario: Remove PIN
		Given the user has already created a PIN
		When I click the *Options* dropdown
		Then I see the options *View PIN*, *Change PIN* and *Remove PIN*
		When I click *Remove PIN*
		Then I see the *Remove device management PIN* modal
			And I see *You will need to sync this device with other devices that have the same facility in order for this PIN to be removed.*
		When I click *Remove PIN*
		Then the modal is closed
			And I see a toast message *PIN removed*
		When I sign in as a learner on a learn-only device
			And I go to the *Device* page
		Then I no longer see the *Enter PIN* modal
			And I can see the *Device* page
