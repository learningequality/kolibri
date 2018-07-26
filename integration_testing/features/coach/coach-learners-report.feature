Feature: Coach learners report
    facility admin should be assign classes to coach facility to access the coach tab
    Coach can look at each of the report types for the progress you have just logged

  Background:
    Given I am signed in to kolibri as a coach facility
    Given there is a learner account with name <username> in class <class>
    And there is a channel with name <channel> with topic <topic> that  contains exercises
    And learner account named <username> has completed all the exercises under topic <topic> containing topic channel <channel>


  Scenario: Reviewing exercise completion of a particular student in a group class for a topic
    When I click on the Coach tab in the sidebar
    Then I see a list of classes
    When I click on the class <class>
    Then I see the *Coach > Learners* page
    When I click on username <username>
    When I click on channel <channel>
    Then I see a row called <topic> with a progress bar showing <exercise_average> column

  Scenario: Reviewing exercise completion of a particular ungroup student for a topic
    When I click on the Coach tab in the sidebar
    Then I see a list of classes
    Then I see the *Coach > Learners* page
    When I click on username <username>
    When I click on channel <channel>
    Then I see a row called <topic> with a progress bar showing <exercise_average> column

Examples:
| username | class     | channel                     | topic          | exercise_average  |
| Hansen   | Buffoons  | Pratham Books' StoryWeaver  | Night Trouble  | 100%              |
