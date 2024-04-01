Feature: Learner accesses courses from a third-party content provider
Learners can access and enroll in courses provided by a third-party content provider integrated into the platform.

Background:
Given I am signed in as a learner user
And there is a third-party content provider integrated with the platform
And I am on the Third-Party Courses page

Scenario: Browse third-party courses
When I am on the Third-Party Courses page
Then I see a list of courses provided by the third-party
When I select a course <third_party_course>
Then I see the course description and an Enroll button

Scenario: Enroll in a third-party course
Given I have selected a course <third_party_course>
When I click the Enroll button
Then I am enrolled in the course
And I have immediate access to the course content

Scenario: Access third-party course content
Given I am enrolled in a third-party course <third_party_course>
When I navigate to the My Courses page
Then I see <third_party_course> listed in my courses
When I click on <third_party_course>
Then I can access and engage with the course content