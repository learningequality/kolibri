Feature: Facility settings
	The user needs to be able to change facility settings such as changing the facility name, allowing learners to join a facility, allowing users to leave a facility and join a different facility, creating a device management PIN

  Background:
    Given that the Kolibri installation was successful
    	And I've set up the device
    	And I am signed in
    	And I am at *Facility > Settings* page

	Scenario: Allow learners to join the facility
		When I select the option *Allow learners to join this facility*
			And I click the *Save changes* button
		Then the option to allow learners to join the facility is enabled
			And I can join the facility as a learner

	Scenario: Allow users to leave this facility and join a different facility
		When I select the option *Allow users to leave this facility and join a different facility*
			And I click the *Save changes* button
		Then the option to allow users to leave this facility and join a different facility is enabled
			And I can leave the facility as a user

	Scenario: Create PIN
		Given there's no existing PIN
		When I click *Create PIN*
		Then I see the *Create device management PIN* modal
			And I see *You will need to sync this device with other devices that share this facility on order to use this PIN. Choose four numbers to set as your new PIN*
		When I enter four numbers
			And I click *Save*
		Then the modal is closed
			And I see a toast message *New PIN created*
		When I sign out
			And I sign in as a learner on a learn-only device
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
			And I see *You will need to sync this device with other devices that share this facility on order to use this PIN. Choose four numbers to set as your new PIN*
		When I enter new a valid 4-digit PIN
			And I click *Save*
		Then the modal is closed
			And I see a toast message *PIN updated*

	Scenario: Remove PIN
		Given the user has already created a PIN
		When I click the *Options* dropdown
		Then I see the options *View PIN*, *Change PIN* and *Remove PIN*
		When I click *Remove PIN*
		Then I see the *Remove device management PIN* modal
			And I see *You will need to sync this device with other devices that share this facility on order to use this PIN.*
		When I click *Remove PIN*
		Then the modal is closed
			And I see a toast message *PIN removed*
