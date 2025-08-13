Feature: Super admin manages network peer locations
  Super admin needs to be able to to automatically discover and connect to nearby Kolibri peers from which they can import content

  Background:
    Given I am signed in to Kolibri as a super admin user, or a user with device permissions to import content
      And I am on the *Select network address* modal
      And I have no manually saved local addresses

  Scenario: No peers are automatically discovered
    When there are no Kolibri peers around me
    Then I see a loading spinner
    # No *Searching* notification any more?
      And I don't see any available addresses displayed in the modal

  Scenario: Connect to a Kolibri peer with content
    When there are Kolibri peers around me
      And peers have content available
    Then I see a loading spinner
    # No *Searching* notification any more?
      And I see a list of found local Kolibri peers # below the manually entered network addresses, if any
      And for each peer I see their device name, 4 digits peer ID, IP address and port
