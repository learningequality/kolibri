Feature: Learner engages with an assigned lesson
  Learner can access the lesson that has been assigned by coach, interact with resources, pause/resume them, complete a lesson and collect points

	Background:
		Given I am signed in as a learner user
			And I am at *Learn > Home > Classes > '<class>'* page
			And there is a <lesson> lesson assigned to me, with <exercise> exercise and <video> video items

	Scenario: Learner can open and view the contents of an assigned lesson
		When I select the <lesson> lesson
		Then I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
			And I see the <exercise> exercise and <video> video cards
			And I see the thumbnails, titles and types of the <exercise> exercise and <video> video
			And I don't see a progress bar on any of the cards

	Scenario: Learner starts an exercise
		Given I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
		When I select the <exercise> exercise content card
		Then I am on *'<lesson>' > '<exercise>'* page
			And I see the <exercise> exercise's first question
		When I submit a correct answer to the question
		Then I see the blue *In progress* icon displayed next to the title
			And I see a green checkmark icon displayed next to the *Next* button
		When I select the *Go back* arrow
		Then I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
			And I see a green progress bar displayed at the bottom of the <exercise> exercise's card

	Scenario: Learner completes an unfinished exercise
		Given I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
		When I select the <exercise> exercise content card with the progress bar
		Then I am on *'<lesson>' > '<exercise>'* page
			And I see the green checkmark icon displayed next to the *Check* button
		When I consecutively answer at least 5 questions correctly
		Then I see the *Resource completed* modal
			And I see the *+500 points* and *Keep up the great progress!* message
			And I see the *Keep going*, *Stay and practice* and *You may find helpful* sections

	Scenario: Learner watches an assigned video and completes the lesson
		Given I've completed the <exercise> exercise and I am at the *Resource completed* modal
		When I select the *Move on* link
		Then I am at *'<lesson>' > '<video>'* page
			And the <video> video starts playing automatically
			And I see the blue *In progress* icon displayed next to the title
		When the <video> video finishes
		Then I see the *Resource completed* modal
			And I see the *+500 points* and *Keep up the great progress!* message
			And I see the *Stay and practice* and *You may find helpful* sections
		When I close the *Resource completed* modal
			And I select the *Go back* arrow
		Then I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
			And I see the yellow star icon and *Completed* label displayed at the lower left corner of the cards
			And I see my points counter is increased by the sum of the points for the completed number of resources

Examples:
  | class      | lesson     | exercise      | video   |
  | Test Class | Test Lesson| Add within 5  | Welcome |
