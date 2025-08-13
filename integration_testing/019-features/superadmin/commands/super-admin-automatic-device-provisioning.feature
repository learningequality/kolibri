Feature: Super admin can provision a device in the same way the setup wizard would
    Super admin needs to be able to customize the Kolibri settings by modifying the options.ini file and pointing to a JSON file in Paths -> AUTOMATIC_PROVISION_FILE

  Background:
    Given that the Kolibri server is not running
      And I have opened the "options.ini" file which is located inside the ".kolibri" folder
      And there are the following sections: [Cache], [Database], [Server], [Paths], [Urls], [Deployment], [Python], [Tasks], [Learn]
      And I have created a JSON file with the following format: {
        "facility_name": "My Facility",
        "preset": "formal",
        "facility_settings": {
            "learner_can_edit_username": true,
            "learner_can_edit_name": true,
            "learner_can_edit_password": true,
            "learner_can_sign_up": true,
            "learner_can_delete_account": true,
            "learner_can_login_with_no_password": false,
            "show_download_button_in_learn": true
        },
        "device_settings": {
            "language_id": "en",
            "landing_page": "learn",
            "allow_guest_access": true,
            "allow_peer_unlisted_channel_import": true,
            "allow_learner_unassigned_resource_access": true,
            "name": "My Device",
            "allow_other_browsers_to_connect": true
        },
        "superuser": {
            "username": "superuser",
            "password": "password"
        }
    }

  Scenario: Setup a device by modifying the AUTOMATIC_PROVISION_FILE setting in the options.ini file
    When I add "AUTOMATIC_PROVISION_FILE = <file path>" under the [Paths] section
      And I save my changes
      And I run the "kolibri start" command in the terminal or command prompt #example file path: /home/user/.kolibri/automatic_device_provisioning.json
    Then I see in the terminal that a facility with name 'My Facility' has been created
    	And I see that all the other presets and settings are updated as specified in the JSON file
    	And I see that the automatic provisioning file is removed from the directory after successful provisioning
    	And I see that the Kolibri server is running
    When I open Kolibri in a web browser
    Then I am at the *Library* page as was specified in the JSON file
    When I go to the *Sign in* page
    	And I enter the credentials specified in the JSON file
    Then I am at the *Device > Channels* page
    	And I see the *Welcome to Kolibri!* message
    When I close the message
    	And I go to *Device > Settings*
    Then I see the *Default language* is set to *English*
    	And I see the *Allow other computers on this network to import my unlisted channels* option is checked
    	And I see the *Default landing page* is set to *Learn page*
    When I go to *Facility > Settings*
    Then I see that the facility name is set to *My facility*
    	And I see that all of the available checkboxes are checked
