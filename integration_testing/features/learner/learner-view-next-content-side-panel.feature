Feature: Learner view selection of next content
  In a lesson context, the learner needs to see the contents of the lesson
  when opening the side panel.
  In a regular context, the learner should see content also in the same topic
  and be linked to the next topic when opening the side panel

  Background:
    Given that I am signed in as a Learner
      And that I have been assigned a <lesson> with multiple items

    Scenario: Opening the side panel and clicking another resource
      Given I am viewing <resource-1> in <lesson>
      When I click the the *View lesson resources* icon in the top menu
      Then I see a side bar appear on the right
        And it says *Also in this lesson*
        And it lists resources, not including the one being currently viewed
      When I click <resource-2>
      Then I am redirected to view <resource-2>
      When I click again on the *View lesson resources* icon in the top menu
      Then I should see <resource-1> as an option, but not <resource-2>
        And I should see my progress reflected next to the entry for <resource-1>
      When I click on the gray area, hit the ESC key or click the X icon
      Then the side bar is closed and I see <resource-2> unobstructed

    Scenario: Viewing a resource whose sibling has a duration set
      Given I am viewing <resource> in the same lesson as <resource-2>, which has a set duration property
      When I click the *View lesson resources* icon in the top menu
      Then I see a side bar appear on the right
        And I see <resource-2> and it displays its duration under its title

  Background:

    Scenario: Viewing content as a guest users
      Given I can view <channel> which has multiple resources nested in folders
      When I view a <topic> which has no sibling topics in the same folder
        And I click to view a <resource> within that <topic>
        And I click to open the side panel while viewing <resource>
      Then I will see all items belonging to <topic> except <resource>
      When I view a <topic-2> which has another folder alongside it <topic-3>
        And I click to view a <resource> within <topic-2>
        And I click to open the side panel while viewing <resource>
      Then I will see all items belonging to <topic-2> except <resource>
        And I will see a link at the bottom, linking me to <topic-3>

  Examples:
  | channel     | resource  | topic-n | lesson          |
  | KA English  | Counting  | Topic N | Counting Lesson |
