Feature: Learner engages EPUB content
  Learner engages with EPUB content from Channels tab and EPUB reader capabilities

  Background:
    Given I am signed in to Kolibri as a Learner user
      And there are one or more channels imported on the device with EPUB content
      And I am on the *Topics* page for a channel with EPUB content

  Scenario Outline: Opens and engages with EPUB paginated content
    When I am on the *Topics* page for <channel>
    Then I see the *Channels > '<channel>'* breadcrumb
      And I see all the topics for the channel <channel>
    When I click the topic <topic>
    Then I see the *Channels > '<channel>' > '<topic>'* breadcrumb
      And I see all the the subtopics and content items of the topic <topic>
      And I see <content_item> content item having a red dog-ear in the top left corner indicating it's a document
    When I click the <content_item> content item
    Then I see the *Channels > '<channel>' > '<topic>' > '<content_item>'* breadcrumb
      And I see the <content_item> content
    But I shouldn't be able to scroll in the <content_item> content
    When I click the button to *Go to next page*
    Then I see the <content_item> content change to the next page
    When I click the button to *Go to previous page*
    Then I see the <content_item> content change to the previous page
      And I see the <content_item> content that I saw before clicking the button to *Go to next page*
    Examples:
      | channel              | topic            | content_item                      |
      | EPub Testing Channel | Richard's EPubs  | The Adventures of Sherlock Holmes |

  Scenario Outline: Opens and engages with EPUB scrolled content
    When I am on the *Topics* page for <channel>
    Then I see the *Channels > '<channel>'* breadcrumb
      And I see all the topics for the channel <channel>
    When I click the topic <topic>
    Then I see the *Channels > '<channel>' > '<topic>'* breadcrumb
      And I see all the the subtopics and content items of the topic <topic>
      And I see <content_item> content item having a red dog-ear in the top left corner indicating it's a document
    When I click the <content_item> content item
    Then I see the *Channels > '<channel>' > '<topic>' > '<content_item>'* breadcrumb
      And I see the <content_item> content
      And I am able to scroll the <content_item> content
    But I do not see buttons to *Go to next page* or *Go to previous page*
    Examples:
      | channel              | topic          | content_item      |
      | EPub Testing Channel | Blaine's EPubs | Epub with Tables! |

  Scenario Outline: Engages with EPUB table of contents
    When I am on the page for the <content_item> content item
    Then I see the *Channels > '<channel>' > '<topic>' > '<content_item>'* breadcrumb
      And I see the <content_item> content
    When I click the button to *Toggle table of contents side bar*
    Then I see the book's table of contents overlaid on the left side of the content
    When I click the button to *Toggle table of contents side bar* again
    Then I see the book's table of contents disappear
    When I click the button to *Toggle table of contents side bar*
    Then I see the book's table of contents overlaid on the left side of the content again
    When I click on the <section> section of the table of contents
    Then I see the table of contents side bar disappear
      And I see the <content_item> content change to the section <section>
    Examples:
      | channel              | topic            | content_item                      |
      | EPub Testing Channel | Richard's EPubs  | The Adventures of Sherlock Holmes |

  Scenario Outline: Engages with EPUB settings
    When I am on the page for the <content_item> content item
    Then I see the *Channels > '<channel>' > '<topic>' > '<content_item>'* breadcrumb
      And I see the <content_item> content
    When I click the button to *Toggle settings side bar*
    Then I see settings for *Text Size* and *Theme* overlaid on the right side of the content
    When I click the button to *Increase text size*
    Then I see the text size of <content_item> become larger
    When I click the button to *Decrease text size*
    Then I see the text size of <content_item> become smaller
      And I see the text size as it was originally
    When I click the button to *Set beige theme*
    Then I see the background of <content_item> become beige
      And I see the text color of <content_item> become brown
    When I click the button to *Set grey theme*
    Then I see the background of <content_item> become grey
      And I see the text color of <content_item> become white
    When I click the button to *Set black theme*
    Then I see the background of <content_item> become black
      And I see the text color of <content_item> become white
    When I click the button to *Set high contrast black theme*
    Then I see the background of <content_item> become black
      And I see the text color of <content_item> become yellow
    When I click the button to *Set high contrast white theme*
    Then I see the background of <content_item> become white
      And I see the text color of <content_item> become blue
    When I click the button to *Set white theme*
    Then I see the background of <content_item> become white
      And I see the text color of <content_item> become black
    When I click the button to *Toggle settings side bar* again
    Then I see the settings side bar disappear
    Examples:
      | channel              | topic            | content_item                      |
      | EPub Testing Channel | Richard's EPubs  | The Adventures of Sherlock Holmes |

  Scenario Outline: Engages with EPUB search
    When I am on the page for the <content_item> content item and section <section> of the content
    Then I see the *Channels > '<channel>' > '<topic>' > '<content_item>'* breadcrumb
      And I see the <content_item> content and <section> in the content
    When I click the button to *Toggle search side bar*
    Then I see the search side bar overlaid on the right side of the content
    When I type <search> into the input to *Enter search query* and click the button to *Submit search query*
    Then I see search results below the input
      And I see <search> highlighted in the EPUB content
    When I click the button to *Toggle search side bar* again
    Then I see the search side bar disappear
      And I see the <search> no longer highlighted in the EPUB content
    Examples:
      | channel              | topic            | content_item                      | section   | search    |
      | EPub Testing Channel | Richard's EPubs  | The Adventures of Sherlock Holmes | Chapter 1 | Chapter I |

  Scenario Outline: Engages with EPUB fullscreen mode
    When I am on the page for the <content_item> content item
    Then I see the *Channels > '<channel>' > '<topic>' > '<content_item>'* breadcrumb
      And I see the <content_item> content
    When I click the button to *Toggle fullscreen*
    Then I see <content_item> content go fullscreen
    When I click the button to *Toggle fullscreen* again
    Then I see the page as it was in the beginning
    Examples:
      | channel              | topic            | content_item                      |
      | EPub Testing Channel | Richard's EPubs  | The Adventures of Sherlock Holmes |
