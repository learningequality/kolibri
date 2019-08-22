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

  Scenario: Search and find by keyword
    Given that there is a lesson <lesson> created
      And that I am on the *Manage resources* page for  <lesson>
    When I enter a keyword into the search box
      And I click the search icon button or press Enter
    Then I am redirected to the search results page
      And I see topic and/or exercise cards on the search results page

  Scenario: Fail to find by keyword
    When I enter a keyword into the search box
      And I click the search icon button or press Enter
    Then I am redirected to the search results page
      And I see the *No results found...* message

  Scenario: Add resources from the search results page
    Given I am on the search results page
      And there are resources available in the search results
    When I check one or more resource checkboxes
    Then I see a snackbar confirmation that *n resources added to the lesson* 

  Scenario: Remove a topic or exercise from the search results page
    Given I am on the search results page
      And there are resources available in the search results
      And some of them are selected
    When I uncheck one or more checkbox
    Then I see the a snackbar confirmation *n resources removed from the lesson*

  Scenario: Filter search results by type
    Given I am on the search results page
      When I open the *Type* filter dropdown
      Then I can see the available formats I can filter by 
      When I select *Exercises* option
      Then I see only exercises among search results
      When I select *Topics* option
      Then I see only topics among search results
      When I select the option *All*
      Then I see both topics and exercises in search results

  Scenario: Use the channel filter
    Given I am on the search results page
      And I see content from channels related to the searched keyword
    When I select a specific channel from the channel filter dropdown
    Then I see the search results are filtered and present content only from the selected channel

  Scenario: Filter coach content in and out
    Given I am on the search results page
      When I select *Coach* filter option
      Then I see the search results are filtered and present only content for coaches
      When I select *Non-coach* filter option
      Then I see the search results are filtered and exclude content for coaches
      When I select the *All* filter option
      Then I see the search results include both coach and non-coach content

  Scenario: View metadata on exercise cards in search results
    Given I am on the search results page
      And there are exercises in the search results
    When I see an exercise card
    Then I see its title
      And I see its description
      And I see whether it is a coach exercise or not

  Scenario: View metadata on topic cards in search results
    Given I am on the search results page
      And there are topics in the search results
    When I see a topic card
    Then I see its title
      And I see its description
      And I see how many coach exercises/topics it contains

  Scenario: Preview a resource from the search results and add/remove it to and from the lesson
    Given I am on the search results page
      And there are resources in the search results page
    When I click an exercise <exercise> card
    Then I am on the preview page for exercise <exercise>
    When I click the *Add* button
    Then I see a snackbar confirmation *1 resource added to the lesson*
      And I see the *Added* label 
      And I see the *Remove* button
    When I click the *Remove* button
    Then I see a snackbar confirmation *1 resource removed from the lesson*
    When I click the *back arrow* button
    Then I see the search results page again
      And I see my results are still present

  Scenario: Exit the search results page
    Given I am on the search results page
      When I click *Exit search*
      Then I see the *Manage resources in '<lesson>'* page again



Examples:
| lesson        | description  | channel                | topic                |
| First lesson  | Fractions 1  | Khan Academy (English) | Recognize fractions  |
