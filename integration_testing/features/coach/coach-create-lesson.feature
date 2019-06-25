Feature: Coach creates lessons
  Coach needs to be able to create lessons from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach - '<class>' > Plan > Lessons* page
      And there is a channel <channel> and topic <topic> on the device

  Scenario: Coach creates a new lesson for entire class
    When I click *New lesson* button
    Then I see the *Create new lesson* modal
    When I fill in the title for the <lesson>
      And I fill in the description <description> # optional
      And I set *Recipients* to group(s) # optional
      And I click *Continue* button
    Then the modal closes
      And I see the <lesson> lesson page

  Scenario: Check validation for the title field
    When I try to enter a title with more than 50 characters
    Then I see that the name is cut at 50
    When I input a same lesson title as for an already existing lesson
    Then I see the error notification *A lesson with this name already exists* 
    When I leave the title field empty
      And I click *Continue*
    Then I see the error notification *This field is required*

  Scenario: Manage lesson resources
    Given that I have created the lesson with title <lesson>
      When I click *Manage resources* button
      Then I am on the *Manage resources in '<lesson>'* page
        And I see the content channel <channel>
      When I select channel <channel>
      Then I see its topics
      When I navigate down to a single topic and click that <topic>
      # A topic may have one or more sub-topics in the topic tree.
      Then I see the list of resources in that topic
      When I click on a single resource
      Then I see the preview page for the selected resource
        And I see the *Add* button
      When I click *Add* button
      Then I see the snackbar notification
        And I see the *Added* state notification
        And I see the *Remove* button
      When I click on *back arrow* button near the *Manage resources* page title at the top
      # The back arrow button is not visible when user has scrolled down at the page or
      # when viewing the page in a small window like the iPad 2.
      Then I see the *Manage resources in '<lesson>'* page again
        And I see the *1 resource in this lesson* counter
      When I uncheck the checkbox(es) for other resource(s)
      Then I see the *N resources in this lesson* counter changed
        And I see the snackbar notification
      When I check the checkbox(es) for other resource(s)
      # This allows us to have a selected resource for the lesson before clicking the Finish button.
      Then I see the *N resources in this lesson* counter changed
        And I see the snackbar notification
      When I click the *Finish* button at the bottom
      Then *Manage resources in '<lesson>'* page closes
        And I see the <lesson> lesson page again
        And I see the resources I added to the <lesson> lesson


Examples:
| lesson        | description  | channel                | topic                |
| First lesson  | Fractions 1  | Khan Academy (English) | Recognize fractions  |
