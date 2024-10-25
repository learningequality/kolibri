Feature: Coach creates lessons
  Coach needs to be able to create lessons from existing content

  Background:
    Given I am signed in to Kolibri as a coach user
      And I am on the *Coach - '<class>' > Lessons* page
      And there is at least one imported channel

  Scenario: Coach creates a new lesson for the entire class
    When I click *New lesson* button
    Then I see the *Create new lesson* modal
    When I fill in the title of the lesson
      And I fill in the description # optional
      And I set the *Recipients* # optional, skip for this case
      And I click the *Save changes* button
    Then the modal closes
    	And I see the *Lesson created* snackbar message
      And I see the lesson details page

  Scenario: Assign existing lesson to different recipients
    Given I am at the lesson details page
    When I click the *...* button
    	And I select the *Edit details* option
    Then I see the *Edit lesson details* modal
    When I change the *Recipients* by selecting *Individual learners* or one of the available groups
      And I click the *Save changes* button
    Then the modal closes
    	And I see the *Lesson created* snackbar message
      And I see the lesson details page
      And the *Recipients* field reflects the changes I've made

  Scenario: Add lesson resources
    Given I am at the lesson details page
    When I click the *Manage resources* button
    Then I am on the *Manage resources in '<lesson>'* page
      And I see the available channels
    When I select a channel
    Then I see its folders
    When I navigate down to a single folder and click that folder
      # A folder may have one or more sub-folders in the folder tree.
    Then I see the list of resources in that folder
    When I click on a single resource
    Then I see the preview page for the selected resource
      And I see the *Add* button
    When I click the *Add* button
    Then I see the snackbar notification
      And I see the *Manage resources in '<lesson>'* page again
      And I see the *N resources in this lesson* value is increased by 1
    When I click the *Save changes* button at the bottom
    Then the *Manage resources in '<lesson>'* page closes
      And I see the lesson details page
      And I see the resources which I've added to the lesson

  Scenario: Search from browse mode (with results)
    Given I am browsing the folders
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
      And I arrived to this page directly from a folder
    When I press the *Exit search* button
    Then I return to the the content listing of the last folder

  Scenario: Search has no results
    Given I am on the *Results for '<searchterm>'* page
      And There are no results for <searchterm>
    Then I see a message saying *No results for '<searchterm>'*
      And I don't see available options in search filters

  Scenario: Clear results and reset search
    Given that there are results from the previous search
    When I press the *X* button in the search field #Or I delete the previous search term and press *Enter*
    Then I still see the previous search results (no change)

  Scenario: Add resources from the search results page
    Given I am on the search results page
      And there are resources available in the search results
    When I check one resource checkbox
    Then I see a snackbar confirmation that *N resources added*

  Scenario: Remove a folder or exercise from the search results page
    Given I am on the search results page
      And there are resources available in the search results
      And some of them are selected
    When I uncheck one checkbox
    Then I see the a snackbar confirmation *N resources removed*

  Scenario: Filter search results by type
    Given I am on the search results page
    When I open the *Type* filter dropdown
    Then I can see the available formats I can filter by
    When I select *Exercises* option
    Then I see only exercises among search results
    When I select *folders* option
    Then I see only folders among search results
    When I select the option *All*
    Then I see both folders and exercises in search results

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

  Scenario: View metadata on folder cards in search results
    Given I am on the search results page
      And there are folders in the search results
      And one of those folders has content for coaches
    When I see a folder card
    Then I see its title
      And I see its description
      And I see how many coach exercises/folders it contains

  Scenario: Preview a resource from the search results and add/remove it to and from the lesson
    Given I am on the search results page
      And there are resources in the search results page
    When I click an exercise card
    Then I am on the preview page for the exercise
    When I click the *Add* button
    Then I see a snackbar confirmation *Added 1 resource to the lesson*
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
