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

  Scenario: Assign existing lesson to different recipient groups
    # Repeat the scenario from the *Coach - '<class>' > Report > Lessons > '<lesson>'* page
    When I change *Recipients* by selecting *Entire class* or one of the groups
      And I click the *Save changes* button
    Then I see the lesson <lesson> page again
      And the *Recipients* field reflects the changes I made

  Scenario: Assign individual learners
    When I change *Recipients* by selecting *Individual learners*
    Then I see a table listing all of the learners in the class.
    When I change *Recipients* by selecting both *Individual learners* and any other group that has learners
    Then I see the learners in the selected group(s) have the checkboxes by their names disabled
    When I select learners in the table by clicking the checkboxes next to their names
      And I click *Save changes*
    Then I can log in as one of the selected individual learners and view the lesson
    When I change *Recipients* by selecting *Entire class* then all groups and *Individual learners* become unchecked
      And I no longer see the table of learners

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
      When I click on *back arrow* button near the <topic> page title at the top
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

  Scenario: Search from browse mode (with results)
      Given I am browsing the topics
      When I enter <searchterm> in the *Search* field
        And I press the *Submit search* button (magnifying glass)
      Then I see the *Results for '<searchterm>'* header
        And I see the search results for <searchterm>
        And I see the search filters
        And I see the *Exit search* button

    Scenario: Search again from search results page
      Given I am on the *Results for '<searchterm>'* page
      When I enter a <searchterm2> in the *Search* textbox
        And I press the *Submit search* button (magnifying glass)
      Then the previous search results disappear
        And I see the results for the <searchterm2>

    Scenario: Exit search with no browser history
      Given I am on the *Results for '<searchterm>'* page
        And I arrived to this page directly from a URL
      When I press the *Exit search* button
      Then I return to the listing of channels

    Scenario: Exit search with browser history
      Given I am on the *Results for '<searchterm>'* page
        And I arrived to this page directly from a topic
      When I press the *Exit search* button
      Then I return to the the content listing of the last topic

    Scenario: Search has no results
      Given I am on the *Results for '<searchterm>'* page
        And There are no results for <searchterm>
      Then I see a message saying *No results for '<searchterm>'*
        And I don't see available options in search filters

  Scenario: Clear results and reset search
    Given that there are results from the previous search
    When I press the *X* button in the search field
      Or I delete the previous search term and press *Enter*
    Then I see the list of all *Channels* under *Select topics or exercises* again

  Scenario: Add resources from the search results page
    Given I am on the search results page
      And there are resources available in the search results
    When I check one resource checkbox
    Then I see a snackbar confirmation that *Added 1 resource to the lesson*

  Scenario: Remove a topic or exercise from the search results page
    Given I am on the search results page
      And there are resources available in the search results
      And some of them are selected
    When I uncheck one checkbox
    Then I see the a snackbar confirmation *Removed 1 resource from the lesson*

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
    When I select *All* in the filter dropdown
    Then I see that results are not filtered anymore

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
    Then I see a snackbar confirmation *Added 1 resource to the lesson*
      And I see the *Added* label
      And I see the *Remove* button
    When I click the *Remove* button
    Then I see a snackbar confirmation *Removed 1 resource from the lesson*
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
