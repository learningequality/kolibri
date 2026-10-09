Feature: Quizzes
  Coaches need to be able to customize quizzes by swapping out questions or editing questions to create the quiz they want.

	Background:
    Given I am signed in to Kolibri as a super admin or a coach
    	And there are imported channels with exercises on the device
    	And there is a class with enrolled learners in it
      And I am at the *Coach - '<class>' > Quizzes* page

	Scenario: Quizzes page overview when there no imported resources
    Given there are no imported channels with exercises on the device
    When I go to *Coach > Quizzes*
    Then I see the *Quizzes* page
    	And I see the *There are no resources on your device yet. Ask an administrator to add resources to your device.* text
    	And I see the *Import channels to your device* link
    	And I see the class name, filters by status and recipients, *Print report* and *Export as CSV* icons
    	And I see an empty table with the following columns: *Title*, *Average score*, *Progress*, *Recipients*, *Size*, *Status*
    	And I see the *You do not have any quizzes* text

	Scenario: Quizzes page overview when there are imported resources
    When I go to *Coach > Quizzes*
    Then I see the *Quizzes* page
    	And I see the *New quiz* button
    	And I see the class name, the total size of quizzes visible to learners, filters by status and recipients, *Print report* and *Export as CSV* icons
    	And I see a table with all of the quizzes with the following columns: *Title*, *Average score*, *Progress*, *Recipients*, *Size*, *Status*

	Scenario: Coach creates a new quiz for the entire class and starts it
  	When I click the *New quiz* button
    	And I select *Create new quiz*
    Then I see the *Create new quiz* modal
    	And I see an empty *Title* field
    	And I see the *Report visibility* drop-down with the *After learner submit quiz* option selected by default
    	And I see the *Recipients* section with the *Entire class* option selected by default
      And I see the *Section order* section with the *Fixed* option selected by default
    	And I see a *Section 1* tab with the following description text: *There are no questions in this section. To add questions, select resources from the available channels.*
    	And I see the *Add questions*, *Add section* and *Options* buttons
      And I see that both the *Save* and *Save and close* buttons are disabled
    When I fill in the title for the quiz
    	And I click the *Add questions* button
    Then I see the *Questions settings for 'Section 1'* side panel
    	And I see the *Number of questions* field with 10 set as default value
    	And I see the unchecked checkbox *Choose questions manually*
    	And I see an active *Continue* button at the bottom
    When I click the *Continue* button
    Then I see the *Add questions to 'Section 1'* side panel
      And I see *Select up to 10 resources*
    	And I see a *Settings* and a *Search* button next to it
      And I see the *Select from channels* and a list with the available channels
    When I click on a channel card
      And I select an exercise with enough questions
      And I click the *Add NN questions* button
    Then I am back at the *Create new quiz* page
    	And I see the *N questions successfully added* snackbar message
      And I see that the questions are added to *Section 1*
    When I click the *Save and close* button
    Then I am back at *Coach > Quizzes*
      And I see the *Changes saved successfully* snackbar message
    	And I see the newly created quiz
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then I see the *Quiz started* snackbar message

  Scenario: Coach selects a practice quiz for the entire class and starts it
  	When I click the *New quiz* button
    	And I select *Select quiz*
    Then I see the *Create new quiz* modal
    	And I see that the *Select a practice quiz* sidebar is expanded
    When I click on a channel card
      And I navigate to a practice quiz
    Then I can see the practice quiz card displayed with a radio-button to the left
    When I select the radio-button
    	And I click the *Select quiz* button
    Then I am back at the *Create new quiz* page
    	And I see the *N questions successfully added* snackbar message
      And I see that the questions are added to *Section 1*
    When I enter the title of the quiz in the *Title* field
    	And I click the *Save and close* button
    Then I am back at *Coach > Quizzes*
      And I see the *Changes saved successfully* snackbar message
    	And I see the newly created practice quiz
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then I see the *Quiz started* snackbar message

  Scenario: Coach can end a quiz
  	Given I am at *Coach > Quizzes*
  		And there are started quizzes with learner progress made
  	When I click the *End quiz* button for a started quiz
  	Then I see the *End quiz* modal with the following text: *All learners will be given a final score and a quiz report. Unfinished questions will be counted as incorrect.*
  	When I click the *Continue* button
  	Then I see a *Quiz ended* snackbar message
  		And I see that the status of the quiz has changed to *Quiz ended*
  	When I click on the title of the quiz
  	Then I am at the quiz details page
  		And I can see *Quiz ended* in the left side panel
  		And I can see the time value for when the quiz was ended
  	When I click the *...* options button to the right of the screen
  	Then I can see only the following options: *Copy quiz* and *Delete*

  Scenario: Coach can review the quiz details
    When I click on the title of a quiz
    Then I see the quiz summary page
    	And I see the quiz title, the *Preview* button and the *...* button next to it
    	And I see the side panel with *Recipients*, *Average score*, *Report visibility*, *Class*, *Section order*, *Size*, *Date created*
    	And I see the *Learners* tab with the learners table
    	And there are the following columns: *Name*, *Progress*, *Sore* and *Groups*
    	And I see the *Difficult questions* tab
    When I click on the name of a learner who has completed the quiz
    Then I see the quiz score card
    	And I can see the *Answer history* of the learner
    When I click the back arrow
    Then I am back at the quiz summary page
    When I click on the *Difficult questions* tab
    Then I see a table with the difficult questions
    	And I see the following columns: *Question*, *Help needed*
    When I click the *Preview* button
    Then I can preview the quiz
    	And I can see the answers to all of the questions

  Scenario: Coach can edit a not started quiz
    Given there is a quiz which is not started yet
    When I click on the title of the quiz
    Then I see the quiz details page
    When I click the *...* drop-down
      And I select the *Edit* option
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
    When I select the *Groups and individual learners* radio button
    Then I see a *Select* link next to it
    When I click the *Select* link
    Then I see the *Select groups and individual learners* side panel
    	And I see all of the available groups
    	And I see a *Search for a user* search field
    	And I see a table with all individual learners
    When I select the desired recipients
    	And I click *Save*
    Then I am back at the quiz editor page
    	And I can see the selected recipients under the *Groups and individual learners* radio button
    When I click the *Save and close* button
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

  Scenario: Coach can delete a quiz
    Given I am at *Coach > Quizzes*
    When I click on the title of a quiz
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
    When I select the *Groups and individual learners* radio button
    Then I see a *Select* link next to it
    When I click the *Select* link
    Then I see the *Select groups and individual learners* side panel
    	And I see all of the available groups
    	And I see a *Search for a user* search field
    	And I see a table with all individual learners
    When I select the desired group or groups
    	And I click *Save*
    Then I am back at the quiz editor page
    	And I can see the selected groups under the *Groups and individual learners* radio button
    When I click the *Save and close* button
    Then I am back at *Coach - '<class>' > Quizzes
      	And I see the snackbar message *Changes saved successfully*
				And I see the change under *Recipients* in the quizzes table
		When I click the title of the quiz
    Then I see the quiz details page
      And I see the groups under the *Recipients* section
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then the page reloads
      And I see the *Start quiz* button changed to *End quiz*

  Scenario: Coach creates a new quiz for individual learners and starts it
    Given I am at *Coach > Quizzes > Create new quiz*
      And I've added a title for the quiz
      And there are sections with questions in the quiz
    When I select the *Groups and individual learners* radio button
    Then I see a *Select* link next to it
    When I click the *Select* link
    Then I see the *Select groups and individual learners* side panel
    	And I see all of the available groups
    	And I see a *Search for a user...* search field
    	And I see a table with all individual learners
    When I select the desired individual learners
    	And I click *Save*
    Then I am back at the quiz editor page
    	And I can see the selected recipients under the *Groups and individual learners* radio button
    When I click the *Save and close* button
    Then I am back at *Coach - '<class>' > Quizzes
      	And I see the snackbar message *Changes saved successfully*
				And I see the change under *Recipients* in the quizzes table
    When I click on the title of the quiz
    Then I see the quiz details page
      And I see the names of the learners under the *Recipients* section
    When I click the *Start quiz* button
    Then I see the *Start quiz* modal
    When I click *Continue*
    Then the page reloads
      And I see the *Start quiz* button changed to *End quiz*

  Scenario: Coach can change the report visibility type of a quiz
  	Given I am at *Coach > Quizzes > Create new quiz*
      And I've added a title for the quiz
      And there are sections with questions in the quiz
      And the default option in *Report visibility* is *After learner submits quiz*
    When I click the *Report visibility* radio-button
    	And I select the *After coach ends the quiz* option
    Then the text under the *Report visibility* drop-down changes to *Learners see their quiz report only when the coach ends the quiz*
    When I click the *Save and close* button
    Then I am back at *Coach - '<class>' > Quizzes
      	And I see the snackbar message *Changes saved successfully*
		When I click the title of the quiz
    Then I see the quiz details page
      And I see the text in *Report visibility* section changed to *After coach ends the quiz*

  Scenario: Coach adds a new section to a quiz
  	Given I am at the *Create new quiz* modal
  		And there is a *Section 1* tab with added questions
  	When I click the *Add section* button
  	Then I see the *Section settings* side panel
    When I fill in the *Section title* #optional
      And I fill in the *Description (optional)* #optional
      And I select the type of question order, either *Randomized* or *Fixed* #*Fixed* is selected by default
      And I click on *Add questions*
    Then I see the *Questions settings for '<section title>'* side panel
    When I click *Continue*
    Then I see the *Add questions to '<section title>'* side panel
    When I select the desired resources
      And I click the *Add NN questions* button
    Then I am back at the quiz details page
      And I see the newly added *'<section title>'* section and all of its questions

   Scenario: Coach can edit a section
   	Given I am at the *Create new quiz* modal
      And there are created sections with added questions
   	When I click the *Options* button
   		And I select *Edit section*
   	Then I see the *Sections settings* side panel
   		And I see the *Section title* and *Description (optional)* fields
   		And I see the radio buttons for the *Question order* with *Fixed* selected by default
   		And I see the *Current number of questions in this section: NN* text
   		And I see the *Add more questions* button
   	When I change one or several of the available settings
   		And I click the *Apply settings* button
   	Then I am back at quiz details page
      And I see the contents of the edited section

   Scenario: Coach can delete a section
   	Given I am at the *Create new quiz* modal
   		And there are created sections with added questions
   	When I click the *Options* button
   		And I select the *Delete section* button
   	Then I see a *Delete section* modal with the following text: *Are you sure you want to delete '<section title>'?*
   	When I click the *Delete* button
   	Then I see a snackbar message *'<section title>' deleted*
   		And I am brought back to the previous existing section

  Scenario: Coach can add more questions to a section
    Given I am at the *Create new quiz* modal
      And there are created sections with added questions
    When I click the *Options* button
   		And I select the *Add more questions* button
    Then I see the *Questions settings for '<section title>'* side panel
    	And I see the *Number of questions* field with 10 set as default value
    	And I see the unchecked checkbox *Choose questions manually*
    	And I see an active *Continue* button at the bottom
    When I select the *Choose questions manually* checkbox
    	And I click the *Continue* button
    Then I see the *Add questions to '<section title>'* side panel
      And I see *Select up to NN resources*
    	And I see a *Settings* and a *Search* button next to it
      And I see the *Select from channels* and a list with the available channels
    When I click on a channel card
      And I click on an exercise with unassigned questions
    Then I see the title of the exercise
    	And I see a selected *Choose questions manually* checkbox and disabled *Save settings* button next to it
    	And I see a table with all of the available questions
    When I select the desired questions
      And I click the *Add NN questions* button
    Then I am back at the *Create new quiz* page
      And I see the *Question list* with all the newly added questions

  Scenario: Coach can add questions from bookmarked resources
    Given I am at the *Add questions to '<section title>'* side panel
      And there are bookmarked exercises on the device
    When I click the *Bookmarks* card
    Then I see the *Select from bookmarks* side panel
    	And I see all of the bookmarked resources
    When I click on an exercise with unassigned questions
    	And I select the desired questions
      And I click the *Add NN questions* button
    Then I am back at the *Create new quiz* page
      And I see the *Question list* with all the newly added questions

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
      And I see a snackbar message *N question(s) deleted*

  Scenario: Coach can replace individual questions
   	Given I am at the *Create new quiz* modal
   		And there is a *Section 1* tab with added questions
   	When I click the replace icon to the right of the question
   	Then I see the *Replace questions in Section N* side panel
   		And I see a list with the available questions
   		And I see options to expand and preview questions
      And I see a disabled *Replace 1 question* button
   	When I select a question
   	Then I see *1 of 1 question selected*
      And I see that the *Replace 1 question* button becomes enabled
   	When I click the *Replace 1 question* button
   	Then I am back at the same section tab
   		And I see the following snackbar message *1 question successfully replaced*
   		And I can see that the question has been replaced

  Scenario: Coach can bulk replace questions
   	Given I am at the *Create new quiz* modal
   		And there is a *Section 1* tab with added questions
   	When I select a question or several questions
   		And I click the *Replace* icon
   	Then I see the *Replace questions in Section N* side panel
   		And I see a list with the available questions
   		And I see options to expand and preview questions
      And I see a disabled *Replace N questions* button
   	When I select the same number of questions
   	Then I see *N of N replacements selected*
      And I see that the *Replace N questions* button becomes enabled
   	When I click the *Replace N questions* button
   	Then I am back at the same section tab
   		And I see the following snackbar message *N question(s) successfully replaced*
   		And I can see that the questions have been replaced

  Scenario: Coach can auto-replace individual questions
   	Given I am at the *Create new quiz* modal
   		And there is a *Section 1* tab with added questions
   	When I click the auto-replace icon to the right of the question
   	Then I see the following snackbar message *1 question successfully replaced*
   		And I can see that the question has been auto-replaced

  Scenario: Coach can auto-replace multiple questions
   	Given I am at the *Create new quiz* modal
   		And there is a *Section 1* tab with added questions
   	When I select a question or several questions
   		And I click the *Auto-replace* icon in the header of the table
   	Then I see the following snackbar message *N question(s) successfully replaced*
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
    When I click again on the title of the question
    Then the question gets collapsed

  Scenario: Coach can change the section order
    Given I am at the *Create new quiz* modal
      And there are several section tabs
      And the *Fixed* radio-button in the *Section order* section is selected by default
    When I click the *Edit - Section order* link
    Then I am at the *Edit - Section order* side panel
      And I see a list with the available sections
    When I click on the drag handle icon and I drag and drop a section to any position of the list
    Then I see the order of the sections changed accordingly
    When I click the *Apply settings* button
    Then I am back at the same section tab
    When I look at the order of the section tabs
    Then I can see that their order is changed accordingly

  Scenario: Coach can change the type of question order in a section
    Given I am at the *Section settings* side panel
      And I have already added several questions
      And *Randomized* is the selected radio button in the *Question order* section
    When I select the *Fixed* radio button
      And I click the *Apply settings* button
    Then I am back at the *Create new quiz* modal #NOTE: This should be further discussed as there is no clear indication whether the questions are randomized or not. Even if I've selected the *Fixed* option I'm still able to reorder them.

  Scenario: Coach can increase or decrease the number of questions to add by manually inputting a valid number
    Given I am at the *Question settings for 'Section N'* side panel
    When I click in the *Number of questions* field
      And I change the value to a different valid number such as 5
	    And I click the *Continue* button
    Then I see the *Add questions to 'Section N'* side panel
      And I see *Select up to 5 resources*
    When I click on a channel card
      And I select an exercise with enough questions
      And I click the *Add NN questions* button
    Then I am back at the *Create new quiz* page
    	And I see the *N questions successfully added* snackbar message
      And I see that the questions are added to *Section N*

  Scenario: Coach can increase or decrease the number of questions to add by using the plus and minus buttons
    Given I am at the *Question settings for 'Section N'* side panel
    When I click the *+* button next to the *Number of questions* field
    Then I see the number of the questions increased by 1
    When I click the *-* button next to the *Number of questions* field
    Then I see the number of the questions decreased by 1
    When I click the *Continue* button
    Then I see the *Add questions to 'Section N'* side panel
      And I see *Select up to N resources*
    When I click on a channel card
      And I select an exercise with enough questions
      And I click the *Add NN questions* button
    Then I am back at the *Create new quiz* page
    	And I see the *N questions successfully added* snackbar message
      And I see that the questions are added to *Section N*

  Scenario: Coach can search for specific questions
    Given I am at the *Add questions to 'Section N'* side panel
    When I click the *Search* button
    Then I see the search panel
    	And I see the *Search by keyword* field
    	And I see the filters by *Category*, *Level*, *Language*, *Accessibility* and *Show resources*
    When I type a keyword
    	And I press the search icon
    Then I see all of the available results for the entered keyword
    When I click the *Search* button again
    Then I am back at the search panel
    When I apply any of the available active filters
    Then I see all of the available results for the applied filter and previously entered keyword
    	And I see the pills with labels of all the filters and the keyword with an *x* icon next to them
    	And I see a *Clear all* link
    When I press the *Clear all* link
    Then I am back at the *Add questions to 'Section N'*
    When I click the *Search* button
    Then I see the default state of the search panel
    When I enter a keyword for non existent item
    Then I see the *No results* text
