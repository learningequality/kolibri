Feature: Super Admin deletes facility from the command line
    Super Admin needs to be able to delete a facility and all its associated data from the device

# Make sure you have more than 1 facility on the device before executing the command!

  Background:
    Given I have super admin account for Kolibri
      And there is a <facility> facility on the device
      And I can run 'kolibri manage' commands in the Terminal or the command prompt

  Scenario: Execute the deletefacility command and review that facility has been deleted
    When I run the 'kolibri manage deletefacility' command in the Terminal
    Then I see the output *Please choose a facility*
      And I see the list of the facilities on the device
    When i type the number of the facility
      And I press the *Enter* key
    Then I see the output *Are you sure you wish to permanently delete this facility? This will DELETE ALL DATA FOR THE FACILITY. [Type 'yes' or 'no'.]*
    When I type *yes*
    Then I see the output *ARE YOU SURE? If you do this, there is no way to recover the facility data on this device. [Type 'yes' or 'no'.]*
    When I type *yes* again
      And the command proceeds to delete the facility
    Then I see the output *INFO Deletion complete*
    When I go to *Device > Facilities*
    Then I don't see the <facility> facility anymore

Examples:
| facility |
| MySchool |
