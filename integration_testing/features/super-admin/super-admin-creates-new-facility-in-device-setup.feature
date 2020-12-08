Feature: Super admin creates new facility during the device setup
  Super admin needs to create their own account and perform the initial facility configuration of Kolibri through the setup wizard

  Background:
    Given that the Kolibri installation was successful
      And the server is running for the first time
      And the browser is opened at the IP address 127.0.0.1:8080
      And I have selected a language in the device setup
      And I have selected *Advanced setup*
      And I have chosen a *Device name*

    Scenario: Create new facility
      Given I see *Create or import facility*
        When I click *New facility*
        Then I see *What kind of learning environment is your facility?*
          And I see *New facility - 1 of 6* in the app bar

    Scenario: Facility setup options
      Given that I am on the *New facility - 1 of 6* of the setup wizard
        And I see *What kind of learning environment is your facility?*
        And I see *Non-formal* option
        And I see *Formal* option
      When I select *Non-formal* or *Formal* options
        But I don't write anything in the *Facility name* field
        And click *Continue*
      Then I see the error notification
      When I input something in the *Facility name* field
        And I click *Continue*
      Then I see the *New facility - 2 of 6* of the setup wizard

    Scenario: Guest access
      Given that I am on the *New facility - 2 of 6* of the setup wizard
        And I see *Enable guest access?*
      When I select/change one of the options
        And I click *Continue*
      Then I see the *New facility - 3 of 6* of the setup wizard

    Scenario: Allow user account creation
      Given that I am on the *New facility - 3 of 6* of the setup wizard
        And I see *Allow anyone to create their own learner account?*
      When I select/change one of the options
        And I click *Continue*
      Then I see the *New facility - 4 of 6* of the setup wizard

    Scenario: Enable passwords
      Given that I am on the *New facility - 4 of 6* of the setup wizard
        And I see *Enable passwords on learner accounts?*
      When I select/change one of the options
        And I click *Continue*
      Then I see the *New facility - 5 of 6* of the setup wizard

    Scenario: Super admin account details for a new facility
      Given that I am on the *New facility - 5 of 6* of the setup wizard
        And I see *Create super admin account*
      When I fill in the full name, username and password fields
        And I click the *Usage and privacy* link
      Then I see the *Usage and privacy* modal
        And I see the text of the privacy statement with the first heading *Users*
      When I click *Close*
      Then the modal closes
      When I click *Continue*
      Then I see the *New facility - 6 of 6* of the setup wizard

    Scenario: Responsibility of the admin regarding privacy
      Given that I am on the *New facility - 6 of 6* of the setup wizard
        And I see *Responsibilities as an administrator*
      When I click the *Usage and privacy* link
      Then I see the *Usage and privacy* modal
        And I see the text of the privacy statement with the first heading *Administrators*
      When I click *Close*
      Then the modal closes
      When I click *Finish*
      Then I see the *Setting up the facility...* page
        And I see the *Welcome to Kolibri!* modal
      When I click *Continue*
      Then I see the *Device > Channels* page
