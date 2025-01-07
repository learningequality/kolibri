Feature: Quizzes
  Coaches need to be able to customize quizzes by swapping out questions or editing questions to create the quiz they want.

	Background:
    Given I am signed in to Kolibri as a super admin or a coach
      And I am at the *Coach - '<class>' > Quizzes* page
      And there are imported channels with exercises on the device

	Scenario: Quizzes page overview
    When I go to *Coach > Quizzes*
    Then I see the *Quizzes* page
    	And I see the *New quiz* button
    	And I see the class name, the total size of quizzes visible to learners, filters by status and recipients, *View learner devices* link, *Print report* and *Export as CSV* icons
    	And I see a table with all of the quizzes with the following columns: *Title*, *Average score*, *Progress*, *Recipients*, *Size*, *Status*

	Scenario: Coach creates a new quiz for the entire class and starts it
  	When I click the *New quiz* button
    	And I select *Create new quiz*
    Then I see the *Create new quiz* modal
    	And I see an empty *Title* field
    	And I see the *Recipients* section with the *Entire class* option selected by default
      And I see the *Section order* section with the *Fixed* option selected by default
    	And I see a *Section 1* tab with the following description text: *There are no questions in this section. To add questions, select resources from the available channels.*
    	And I see the *Add questions*, *Add section* and *Options* buttons
      And I see that both the *Save* and *Save and close* buttons are disabled
    When I fill in the title for the quiz
    	And I click the *Add questions* button
    Then I see the *Add questions to 'Section 1'* modal
      And I see *Current number of questions in this section: 0*
    	And I see a search field
      And I see *You can only select a total of 100 questions or fewer.*
      And I see a list with the available channel resources
    When I click on a channel card
      And I select an exercise with enough questions
      And I click the *Add NN questions* button
    Then I am back at the *Create new quiz* page
      And I see that the questions are added to *Section 1*
    When I click the *Save and close* button
    Then I am back at *Coach > Quizzes*
      And I see the *Changes saved successfully* snackbar message
    	And I see the newly created quiz
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then I see the *Quiz started* snackbar message

  Scenario: Review quiz details
    When I click on the title of a quiz
    Then I see the quiz summary page
    	And I see the quiz title, the *Preview* button and the *...* button next to it
    	And I see the side panel with *Report visible to learners* status, *Recipients*, *Average score*, *Class*, *Question order*, *Size*, *Date created*
    	And I see the *Learners* tab with the learners table
    	And there are the following columns: *Title*, *Progress* and *Score* and *Groups*
    	And I see the *Difficult questions* tab
    When I click on the *Difficult questions* tab
    Then I see a table with the difficult questions
    	And I see the following columns: *Question*, *Help needed*

  Scenario: Coach can edit a not started quiz
    Given there is a quiz which is not started yet
    When I click on the title of the quiz
    Then I see the quiz details page
    When I click the *...* drop-down
      And I select the *Edit details* option
    Then I see the quiz editor modal
    When I make some changes to the quiz
      And I click the *Save and close* button
    Then I am back at *Coach > Quizzes*
      And I see the *Changes saved successfully* snackbar message
      And I see the edited quiz
    When I click on the title of the quiz
    Then I see the quiz details page
      And I can see that the changes I've made are visible there

  Scenario: Coach can reassign a quiz
    Given I am at the quiz details page
    When I click the *...* button
      And I select *Edit details*
    Then I see the full-page *Edit quiz details* modal
    When I change the *Recipients* by selecting one of the groups or some individual learners
      And I click *Save and close* button
    Then I am back at *Coach - '<class>' > Quizzes
      	And I see the snackbar message *Changes saved successfully*
				And I see the change under *Recipients* in the quizzes table

  Scenario: Coach can copy a not started quiz
    Given there is a quiz which is not started yet
    When I click on the title of the quiz
    Then I see the quiz details page
    When I click the *...* drop-down
      And I select the *Copy quiz* option
    Then I see the *Copy quiz to* modal
    When I select a class
      And I click *Continue*
    Then I see again the *Copy quiz to* modal
      And I see options to assign the quiz to the entire class, groups or individual learners
    When I select the desired option
      And I click *Copy*
    Then I am back at the quiz details page
      And I see a *Quiz copied* snackbar message
    Then I am back at *Coach > Quizzes*
      And I see the copied quiz
    When I click on the title of the quiz
    Then I see the quiz details page

  Scenario: Coach can delete a not started quiz
    Given there is a quiz which is not started yet
    When I click on the title of the quiz
    Then I see the quiz details page
    When I click the *...* drop-down
      And I select the *Delete* option
    Then I see the *Delete quiz* modal
    When I click *Delete*
    Then I am back at *Coach > Quizzes*
      And I no longer see the deleted quiz

  Scenario: Coach creates a new quiz for a group and starts it
    Given I am at *Coach > Quizzes > Create new quiz*
      And there are created groups with learners
      And I've added a title for the quiz
      And there are sections with questions in the quiz
    When I select a group from the *Recipients* section
      And I click the *Save and close* button
    Then I am back at *Coach > Quizzes*
      And I see the *Changes saved successfully* snackbar message
      And I see the newly created quiz
    When I click on the title of the quiz
    Then I see the quiz details page
      And I see the group name under the *Recipients* section
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then the page reloads
      And I see the *Start quiz* button changed to *End quiz*

  Scenario: Coach creates a new quiz for individual learners and starts it
    Given I am at *Coach > Quizzes > Create new quiz*
      And I've added a title for the quiz
      And there are sections with questions in the quiz
    When I select the *Individual learners* checkbox from the *Recipients* section
    Then I see the *Select individual learners* table
    When I select some of the learners
      And I click the *Save and close* button
    Then I am back at *Coach > Quizzes*
      And I see the *Changes saved successfully* snackbar message
      And I see the newly created quiz
    When I click on the title of the quiz
    Then I see the quiz details page
      And I see the names of the learners under the *Recipients* section
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then the page reloads
      And I see the *Start quiz* button changed to *End quiz*

  Scenario: Coach adds a new section to a quiz
  	Given I am at the *Create new quiz* modal
  		And there is a *Section 1* tab with added questions
  	When I click the *Add section* button
  	Then I see the *Section settings* modal
    When I fill in the *Section title*
      And I fill in the *Description (optional)*
      And I select the type of question order, either *Randomized* or *Fixed*
      And I click on *Add questions*
    Then I see the *Add questions to 'Section 2'* modal
    When I select the desired number of questions
      And I click the *Add NN questions* button
    Then I am back at the quiz details page
      And I see that the questions are added to *Section 2*

   Scenario: Coach can edit a section
   	Given I am at the *Create new quiz* modal
      And there are created sections with added questions
   	When I click the *Options* button
   		And I select *Edit section*
   	Then I see the *Sections settings* modal
   		And I see the *Section title* and *Description (optional)* fields
   		And I see the radio buttons for the *Question order* with *Randomized* selected by default
   		And I see the *Current number of questions in this section: NN* text
   		And I see an *Add questions* button
   		And I see the *Section order* section with all of the available sections
   	When I change one or several of the available settings
   		And I click the *Apply settings* button
   	Then I am back at quiz details page
      And I see the contents of the edited section

   Scenario: Coach can delete a section
   	Given I am at the *Create new quiz* modal
   	When I click the *Options* button
   		And I select the *Delete section* button
   	Then I see a *Delete section* modal with the following text: *Are you sure you want to delete 'Section N'?*
   	When I click the *Delete* button
   	Then I see a snackbar message *'Section N' deleted*
   		And I am brought back to the previous existing section

   Scenario: Coach can change the order of the questions
   	Given I am at the *Create new quiz* modal
   		And there is a *Section 1* tab with added questions
   	When I click on the drag handle icon and I drag and drop a question to any position of the list with questions
   	Then I see the order of the questions changed accordingly

   Scenario: Coach can delete questions
   	Given I am at the *Create new quiz* modal
   		And there is a *Section 1* tab with added questions
   	When I select a question or several questions
   		And I click the *Delete* icon
   	Then all of the selected questions are removed from the list
      And I see a snackbar message *N questions deleted*

   Scenario: Coach can replace questions
   	Given I am at the *Create new quiz* modal
   		And there is a *Section 1* tab with added questions
   	When I select a question or several questions
   		And I click the *Replace* icon
   	Then I see the *Replace questions in Section N* modal
   		And I see the following text: *The new questions you select will replace the current ones.*
   		And I see a list with the available questions
   		And I see options to expand and preview questions
      And I see *0 of N replacements selected*
   	When I select the same number of questions
   	Then I see *N of N replacements selected*
      And I see that the *Replace* button becomes enabled
   	When I click the *Replace* button
   	Then I see the *Replace questions* modal with the following text: *The new questions you selected will replace the current ones. You can't undo or cancel this.*
   	When I click the *Confirm* button
   	Then I am back at the same section tab
   		And I see the following snackbar message *N question(s) successfully replaced*
   		And I can see that the questions have been replaced

   Scenario: Coach can expand and collapse questions
    Given I am at the *Create new quiz* modal
      And there is a *Section 1* tab with added questions
      And all questions are collapsed by default
    When I click the *Expand all* button
    Then all the questions get expanded
      And I can see a preview of each question
    When I click the *Collapse all* button
    Then all the questions get collapsed
    When I click on the title of an individual question
    Then the question gets expanded
      And I can see a preview of the question
    When I select one or several questions
      And I click the *Replace* button
    Then I see the *Replace questions* modal
    When I click the *Expand all* button
    Then all the questions get expanded
      And I can see a preview of each question
    When I click the *Collapse all* button
    Then all the questions get collapsed
    When I click on the title of an individual question
    Then the question gets expanded
      And I can see a preview of the question

   Scenario: Coach can change the section order
    Given I am at the *Create new quiz* modal
      And there are several section tabs
    When I click the *Options* button
      And I select *Edit section*
    Then I am at the *Section settings* modal
      And I see the *Section order* section at the bottom of the page
      And I see a list with the available sections
    When I click on the drag handle icon and I drag and drop a section to any position of the list
    Then I see the order of the sections changed accordingly
    When I click the *Apply settings* button
    Then I am back at the same section tab
    When I look at the order of the section tabs
    Then I can see that their order is changed accordingly

   Scenario: Coach can increase or decrease the number of questions to add by manually inputting a valid number
    Given I am at the *Add questions to 'Section N'* modal
      And I have already selected a card with questions
    When I click in the *Number of questions* field
      And I change the value to a different valid number such as 5
    Then I see the numeric value in the *Add N questions* button changed to the specified number
    When I click the *Add N questions* button
    Then I am back at the *Create new quiz* modal
      And I can see that now there are 5 more questions added

   Scenario: Coach can increase or decrease the number of questions to add by using the plus and minus buttons
    Given I am at the *Add questions to 'Section N'* modal
      And I have already selected a card with questions
    When I click the *+* button next to the *Number of questions* field
    Then I see the number of the questions increased by 1
      And I see the numeric value in the *Add N questions* button changed to the specified number
    When I click the *-* button next to the *Number of questions* field
    Then I see the number of the questions decreased by 1
      And I see the numeric value in the *Add N questions* button changed to the specified number
    Then I am back at the *Create new quiz* modal
      And I can see that there are all of the added questions

  Scenario: Coach can change the type of question order in a section
    Given I am at the *Section settings* modal
      And I have already added several questions
      And *Randomized* is the selected radio button in the *Question order* section
    When I select the *Fixed* radio button
      And I click the *Apply settings* button
    Then I am back at the *Create new quiz* modal #NOTE: This should be further discussed as there is no clear indication whether the questions are randomized or not. Even if I've selected the *Fixed* option I'm still able to reorder them.

  Scenario: Coach can add questions from bookmarked resources
    Given I am at the *Create new quiz* modal
      And there are bookmarked exercises on the device
    When I click the *Add questions* button
    Then I see the *Add questions to 'Section N'* modal
      And I see the following text: *Select from bookmarks*
      And I see a *Bookmarks* card with the number of bookmarked exercises
    When I click on the *Bookmarks* card
    Then I see a list with the available bookmarked exercises
    When I select one or several exercises
      And I click the *Add N questions* button
    Then I am back at the *Create new quiz* page
      And I see the *Question list* with all the imported questions

  Scenario: Coach can search for specific questions
    Given I am at the *Create new quiz* modal
    When I click the *Add questions* button
    Then I see the *Add questions to 'Section N'* modal
    When I click the *Search* button
    Then I see search panel
    	And I see the *Search by keyword* field
    	And I see the filters by *Category*, *Level*, *Language*, *Channel*, *Accessibility* and *Show resources*
    When I type a keyword
    	And I press the search icon
    Then I see all of the available results for the entered keyword
