Feature: Coach review of learner reports
  Coach needs to be able to review progress reports for learners

  Background:
    Given I am signed in to Kolibri as a facility coach
      And there is a learner user <full_name> enrolled in class <class>
      And there is a channel <channel> with topic <topic> that learner <full_name> has interacted with

  Scenario: Review progress of a particular student in a class
    When I open the sidebar
      And click on *Coach*
    Then I see a list of all classes in the facility
    When I click on the class <class>
    Then I see the *Learner reports* for class <class> on *Coach > Learners* page
      And I see the *Classes > '<class>' > Learners* breadcrumb
    When I click on learner <full_name>
    Then I see the *Classes > '<class>' > Learners > '<full_name>'* breadcrumb
      And I see all the channels available on the device
    When I click the channel <channel>
    Then I see the *Classes > '<class>' > Learners > '<full_name>' > '<channel>'* breadcrumb
      And I see all the topics for the channel <channel>
      And I see *Avg. exercises progress* and *Avg. resource progress* columns with progress bars for each topic
    When I click the topic <topic>
    Then I see the *Classes > '<class>' > Learners > '<full_name>' > '<channel>' > '<topic>'* breadcrumb
      And I see all the subtopics of the <topic> topic for the channel <channel>
      And I see *Avg. exercises progress* and *Avg. resource progress* columns with progress bars for each subtopic
    When I click the subtopic <subtopic>
    Then I see the *Classes > '<class>' > Learners > '<full_name>' > '<channel>' > '<topic>' > '<subtopic>'* breadcrumb
      And I see all the content items of the subtopic <subtopic> of the <topic> topic for the channel <channel>
      And I see *Avg. exercises progress* progress bar(s) for the excercise content items
      And *Avg. resource progress* progress bar(s) for the resource content items
      But I cannot click the individual content items

Examples:
| full_name | class     | channel        | topic    | subtopic |
| Hansen    | Buffoons  | Kolibri Demo 1 | Science  | Physics  |
