Feature: Super Admin bulk import users into a facility
    Super Admin needs to be able to do a bulk import of users using the command line, together with the information about the classes they are enrolled or assigned to

  Background:
    Given that the Kolibri server has one device with one or more facilities

  Scenario: Execute the bulkimportusers command and review the report
    When I run the 'kolibri manage bulkimportusers --dryrun --output-file=test.csv' command in the Terminal
    Then I see a report containing the number of users and classes to be created, deleted and updated
      And I see the list of errors, if any

  Scenario: Execute the bulkimportusers command and review the users and classes are created
    When I run the 'kolibri manage bulkimportusers  --output-file=test.csv ' command in the Terminal
    Then I see a report containing the number of users and classes to be created, deleted and updated
      And I see the list of errors, if any
    When I open the facility in the browser
    Then I can see the new users and classes have been created, with the coaches assigned and the learners enrolled
      And none of the preexisting users have been modified # still assigned/enrolled as they were before.

  Scenario: Execute the import command and review the users and classes are deleted and updated
    When I create a new CSV file changing some information of the existing users
      But the CSV file does not contain all the users registered at the facility
    When I run the 'kolibri manage bulkimportusers --delete --output-file=test2.csv ' command in the Terminal
    Then I see a report containing the number of users and classes to be created, deleted and updated
      And I see the list of errors, if any
    When I open the facility in the browser
    Then I see the users have been modified with the new data from the CSV
      And I see that the non-admin users not listed in the CSV file have been deleted
      And I see that old classes not listed in the CSV file have been deleted
      And the facility contains just classes and users listed in the CSV file

# CSV file content example (for the first row, texts not inside parenthesis may be translated). For the UUID column, it will be empty to create the user, otherwise it will contain an uuid4 :
Database ID (UUID),Username (USERNAME),Password (PASSWORD),Full name (FULL_NAME),User type (USER_TYPE),Identifier (IDENTIFIER),Birth year (BIRTH_YEAR),Gender (GENDER),Learner enrollment (ENROLLED_IN),Coach assignment (ASSIGNED_TO)
,jkrowling,passwd1,Too bad to be here,STUDENT,Potter1,1899,FEMALE,Literature 0,
,ignored_data,passwd2,You are not a coach,LEARNER,,,,,Ignored class
,new_coach,passwd3,Miguel de Cervantes,CLASS_COACH,Sancho1,1969,MALE,,Literature 1
,student1,passwd4,William Shakespeare,LEARNER,Otelo1,2001,MALE,Literature 1,
,student2,passwd5,Agatha Christie,LEARNER,Poirot1,1999,FEMALE,"Literature 1,Chemistry2",
