Feature: Superuser import content
    Admin needs to be able to import content channels on the device

  Background:
    Given I am signed in to Kolibri as superuser
      And I am on *Device > Content* page

  Scenario: Import content channels from Kolibri Studio
    When I click on *Import* button
    Then I see *Import from* modal
    When I select *Kolibri Studio* 
      And I click *Continue*
    Then I see the *Kolibri Studio* page with the list of available content *Channels*
    When I click *Select* button for the <channel> channel
    Then I see the *Select content from '<channel>'* page



     and select channels to import


Examples:
| channel       | username |
| MIT Blossoms  | coach    |
| Neela R.      | ccoach   |
| John C.   | learner  |
| Carrie W. | admin2   |


