Feature: Learner interacts with an assigned lesson
  Learner can access the lesson that has been assigned by coach, interact with resources, pause/resume them, complete a lesson and collect points

	Background:
		Given I am signed in as a learner user
			And I am at *Learn > Home > Classes > '<class>'* page
			And there is a lesson assigned to me, with an exercise and a video resource

	Scenario: Learner can open and view the contents of an assigned lesson
		When I click on the lesson card
		Then I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
			And I see the exercise and video cards arranged in a single column
			And I see the thumbnails, titles and types of the resources
			And I don't see a progress bar on any of the cards

	Scenario: Learner starts and completes an exercise
		Given I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
		When I click on an exercise content card
		Then I am at the exercise page
			And I can see the exercise's first question
		When I submit a correct answer to the question
		Then I see the blue *In progress* icon displayed next to the title
			And I see a green checkmark icon displayed next to the *Next* button
		When I click the *Go back* arrow
		Then I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
			And I see a green progress bar displayed at the bottom of the exercise's card
		When I click on the exercise content card with the progress bar
		Then I am at the exercise page
		When I consecutively answer correctly the required number of questions for the successful completion of the exercise
		Then I see the *Resource completed* modal
			And I see the *+500 points* and *Keep up the great progress!* message
			And I see the *Keep going*, *Stay and practice* and *You may find helpful* sections
		When I close the *Resource completed* modal
		Then I am back at the exercise page
			And I see a yellow *Completed* icon next to the title of the exercise
		When I click the *Go back* arrow
		Then I am back at *Learn > Home > Classes > '<class>' > '<lesson>'* page
			And I see a yellow *Completed* icon displayed at the bottom of the exercise's card

	Scenario: Learner watches an assigned video and completes the lesson
		Given I've completed the exercise and I am at the *Resource completed* modal
		When I select the *Move on* link
		Then I am at the video page
			And the video starts playing automatically
			And I see the blue *In progress* icon displayed next to the title
		When the video has finished
		Then I see the *Resource completed* modal
		When I close the *Resource completed* modal
			And I select the *Go back* arrow
		Then I am at *Learn > Home > Classes > '<class>' > '<lesson>'* page
			And I see the yellow star icon and *Completed* label displayed at the lower left corner of the cards
			And I see my points counter is increased by the sum of the points for the completed number of resources
			And I see that there's also *Completed* yellow icon next to the title of the lesson
