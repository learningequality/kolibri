Feature: Learner interacts with EPUB content
  Learner needs to be able to interact with with EPUB content and use all the EPUB reader features

  Background:
    Given I am signed in to Kolibri as a Learner user
      And there is at least one channel imported on the device with EPUB content
      And I am on the *Browse channel* page for a channel with EPUB content

    Scenario: Learner finds and opens a paginated EPUB
      When I am at the *Browse channel* page for a channel
      Then I see the channel name, logo and description
        And I see all the available folders for the channel
      When I click on a folder with EPUBs
      Then I see the *'<channel>' > '<folder>'* breadcrumb
        And I see all the the subfolders and resources of the folder
        When I click on a EPUB resource card
        Then I see the EPUB file reader
        	And I see the icons for table of contents, settings, search and full screen
        	And I see a slider in percents
        	And I see the EPUB content and a right arrow button
        When I click the right arrow button
        Then I see the next page of the EPUB
        When I click the left arrow button
        Then I see the previous page of the EPUB

    Scenario: Learner opens an EPUB with tables
      Given that the EPUB resource contains tables
        When I click the EPUB card
        Then I see the *'<channel>' > '<folder>' > '<resource>'* breadcrumb
          And I see the EPUB reader
          And I am able to scroll vertically the EPUB's content
          And I do not see left and right arrow buttons to go to next and previous page

    Scenario: Learner interacts with with the EPUB table of contents
    	Given I am viewing an EPUB with table of contents
      When I click the table of contents button in the upper left corner
      Then I see the EPUB's table of contents overlay on the left side
      When I click on a heading inside the table of contents
      Then I see the table of contents side bar disappear
        And I see the EPUB's content change to the selected heading

    Scenario: Learner interacts with with EPUB settings
    	Given I am viewing an EPUB
      When I click the settings button
      Then I see the settings sidebar overlay at the right side of the content
        And options for *Text size* and *Theme*
      When I click a button to increase or decrease the text size
      Then I see the text size of the EPUB changed according to the selected option
      When I click on any of the available theme buttons
      Then I see the background of the EPUB changed according to the selected option
      When I click the settings button again
      Then I see the settings sidebar disappear
      	And I see that the applied settings persist

    Scenario: Learner interacts with with the EPUB search
    	Given I am viewing an EPUB
      When I click the search button
      Then I see the search sidebar overlay at the right side of the EPUB content
      When I type my search term into the field
        And I press the keyboard's Enter key or click the search icon next to the field
      Then I see the number of search results under the field
      	And I see all the search term matches
        And I see the search term highlighted in the EPUB content
      When I click on a search result
      Then I see the page of the document containing the search term
      When I click the search button again
      Then I see the search sidebar disappear
        And I see that the search term is no longer highlighted in the EPUB content

    Scenario: Learner interacts with with the EPUB's full screen mode
      When I click the button for full screen
      Then I see the EPUB viewer expands in full screen
      When I click the button to exit full screen or I press the keyboard's Esc key
      Then I see EPUB viewer as before
