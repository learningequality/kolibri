Feature: Import facility from a peer (post-setup)
  Super admin is able to import another facility to their device at any time after device setup

  Background:
    Given I am signed in as a super admin
      And I am in *Device > Facilities*

  Scenario: Select peer device
    When I click the *Import facility* button
    Then I see the *Select network address* modal
      And I see a list of peer devices
      And I see the network address of each device
    When I select a <peer> device
      And I click *Continue*
    Then I see the *Select facility* modal
      And I see one or more facilities on that device

  Scenario: Import facility from a peer with a single facility
    Given there is only the <facility> facility on the <peer> device
      And I am on the *Enter admin credentials* modal
    When I enter the <username> and <password> of a facility admin for the <facility> or a super admin for the <peer>
      And I click *Continue*
    Then I see the <facility> appear in my *Facilities* list
      And I see an indeterminate spinner
      And I see the status message *Syncing*
      And I see the *task manager* has a new task
    When the <facility> is done syncing
    Then I see a message under the new facility name *Last synced: just now*

  Scenario: Import facility from a peer with multiple facilities
    Given there is more than one facility on the <peer> device
      And I am on *Select facility* modal
      And I see two or more facilities on that device
    When I select the facility I want to import
      And I click *Continue*
    Then I am on the *Enter admin credentials* modal
    When I enter the <username> and <password> of a facility admin for the <facility> or a super admin for the <peer>
      And I click *Continue*
    Then I see the *Tasks* page
      And I see the status message *Syncing '<facility>'*
      And I see an indeterminate spinner
    When the <facility> import is finished
      And I click *Back to facilities*
    Then I see the <facility> appear in my *Facilities* list
      And I see a message under the new <facility> *Last synced: just now*

  Scenario: Import facility from a peer failed
    Given a sync task is running
    When the sync fails for a <facility>
    Then I see *Failed sync: just now* under the <facility> name
      And I see *Last successful sync: <X> <time> ago under the failed sync message

Examples:
| facility | peer   |
| MySchool | MyPeer |
