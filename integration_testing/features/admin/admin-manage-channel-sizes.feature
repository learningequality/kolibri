Feature: Admin Device Management Channel Sizes
  Admin should see the correct file sizes and resource counts regarding a channel

  Background:
    Given I am signed into Kolibri as an admin user
      And I am on the *Device > Channels* page

  Scenario: Correct file sizes when transferring content
    When I am doing an <transfer_workflow>
      And I go to the *Select Content Page* for <channel_name>
    Then In the *Size: Total size* cell, it says <total_file_size>
      And In the *Size: On your device* cell, it says <on_device_file_size>
      And In the *Resources: Total size* cell, it says <total_resources>
      And In the *Resources: On your device* cell, it says <on_device_resources>

Examples:
| channel_name        | on_device_file_size | total_file_size | on_device_resources | total_resources |
| Khan Academy        | 1 GB                | 10 GB           | 10                  | 100             |

Examples:
| transfer_workflow               |
| Import from Kolibri Studio      |
| Import more from Kolibri Studio |
| Export to a USB drive           |
| Import from a USB drive         |
| Import from a Peer              |
