Feature: Learner engages ePUB content
  Learner needs to be able to engage with ePUB content and use all the ePUB reader features

  Background:
    Given I am signed in to Kolibri as a Learner user
      And there are one or more channels imported on the device with ePUB content
      And I am on the *Channels* page for a channel with ePUB content

    Scenario: Browse and find ePUB content
      When I am on the *Channels* page for <channel>
      Then I see the *Channels > '<channel>'* breadcrumb
        And I see all the topics for the channel <channel>
      When I click the topic <topic>
      Then I see the *Channels > '<channel>' > '<topic>'* breadcrumb
        And I see all the the subtopics and resources of the topic <topic>
        And I recognize <resource> resource as an ePUB document by the content type icon in the upper left corner

    Scenario: Open paginated ePUB
      Given that <resource> resource does not contain tables
        When I click the <resource> resource
        Then I see the *Channels > '<channel>' > '<topic>' > '<resource>'* breadcrumb
          And I see the <resource> content
            But I cannot scroll vertically to see the next page
        When I click the right arrow button to go to next page
        Then I see the next page of the <resource>
        When I click the left arrow button to go to previous page
        Then I see the previous page of the <resource>

    Scenario: Open ePUB with tables
      Given that <resource> resource contains tables
        When I click the <resource> resource
        Then I see the *Channels > '<channel>' > '<topic>' > '<resource>'* breadcrumb
          And I see the <resource> content
          And I am able to scroll vertically the <resource> content
            But I do not see left and right arrow buttons to go to next and previous page

    Scenario: Engage with ePUB table of contents
      When I click the table of content button in the upper left corner 
      Then I see the book's table of contents overlaid on the left side
      When I click table of content button again
      Then I see the book's table of contents disappear
      When I click the button to *Toggle table of contents side bar*
      Then I see the book's table of contents overlaid on the left side of the content again
      When I click on a heading inside the table of contents
      Then I see the table of contents side bar disappear
        And I see the <resource> content change to the chosen heading

    Scenario: Engage with EPUB settings
      When I click the settings button
      Then I see the settings sidebar overlaid on the right side of the content
        And options for *Text Size* and *Theme* 
      When I click the button to *Increase text size*
      Then I see the text size of <resource> become larger
      When I click the button to *Decrease text size*
      Then I see the text size of <resource> become smaller
        And I see the text size as it was originally
      When I click the button to *Set beige theme*
      Then I see the background of <resource> become beige
        And I see the text color of <resource> become brown
      When I click the button to *Set gray theme*
      Then I see the background of <resource> become gray
        And I see the text color of <resource> become white
      When I click the button to *Set black theme*
      Then I see the background of <resource> become black
        And I see the text color of <resource> become white
      When I click the button to *Set high contrast black theme*
      Then I see the background of <resource> become black
        And I see the text color of <resource> become yellow
      When I click the button to *Set high contrast white theme*
      Then I see the background of <resource> become white
        And I see the text color of <resource> become blue
      When I click the button to *Set white theme*
      Then I see the background of <resource> become white
        And I see the text color of <resource> become black
      When I click the settings button again
      Then I see the settings sidebar disappear

    Scenario: Engages with EPUB search
      When I click the search button
      Then I see the search sidebar overlaid on the right side of the content
      When I type my <search> term into the field
        And press Enter key or click the button after the field
      Then I see search results below the field
        And I see <search> term highlighted in the ePUB content
      When I click the search button again
      Then I see the search sidebar disappear
        And I see the <search> term is no longer highlighted in the ePUB content

    Scenario: Engages with EPUB fullscreen mode
      When I click the button for fullscreen 
      Then I see ePUB viewer expands fullscreen
      When I click the button to exit fullscreen or I press the Esc key
      Then I see ePUB viewer as before


Examples:
  | channel              | topic            | resource                          | search |
  | EPub Testing Channel | Richard's EPubs  | The Adventures of Sherlock Holmes | home   |
  | EPub Testing Channel | Blaine's EPubs   | Epub with Tables!                 | street |
