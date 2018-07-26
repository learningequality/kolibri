Feature: Coach review of learner reports
    Coach needs to be able to review progress reports for learners

  Background:
    Given I am signed in to Kolibri as a facility coach
    Given there is a learner account with name <username> in class <class>
    And there is a channel <channel> and topic <topic> that contains exercises
    And learner account named <username> has completed all the exercises under topic <topic> in the channel <channel>


  Scenario: Review exercise completion of a particular student in a group class for a topic
    When I open the sidebar and click on *Coach*
    Then I see a list of classes
    When I click on the class <class>
    Then I see the *Coach > Learners* page
    When I click on username <username>
    When I click on channel <channel>
    Then I see a row called <topic> with a progress bar showing <exercise_average> column

Examples:
| username | class     | channel                     | topic          | exercise_average  |
| Hansen   | Buffoons  | Pratham Books' StoryWeaver  | Night Trouble  | 100%              |