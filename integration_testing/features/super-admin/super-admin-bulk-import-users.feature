Feature: Super Admin import users into a facility in a device with manage bulkexportusers command
    Super Admin needs to be able to do a bulk import of the users and classes, with the information to enroll or assign coaches to the classes

  Background:
    Given that the Kolibri server has one device with one or more facilities

  Scenario: Execute the import command and review the report
    When I run the 'kolibri manage bulkimportusers --dryrun --output-file=test.csv ' command in the Terminal
    Then I see in the terminal a report containing the number of users to be created, deleted and updated. Same thing for the classes. I also see the possible errors the file contains

  Scenario: Execute the import command and review the users and classes are created
    When I run the 'kolibri manage bulkimportusers  --output-file=test.csv ' command in the Terminal
    Then I see in the terminal a report containing the number of users to be created, deleted and updated. Same thing for the classes. I also see the possible errors the file contains.
    Then I open the kolibri facility in the browser and check the users and classes have been created, with the coaches assigned and the learners enrolled.
      And none of the previous users have been modified and continue assigned/enrolled as they were before.

  Scenario: Execute the import command and review the users and classes are deleted and updated.
    When I create a new csv file changing some information of the existing users, and without all the users the facility has.
    When I run the 'kolibri manage bulkimportusers --delete --output-file=test2.csv ' command in the Terminal
    Then I see in the terminal a report containing the number of users to be created, deleted and updated. Same thing for the classes. I also see the possible errors the file contains.
    Then I open the kolibri facility in the browser and check the users have been modified.
      And I check the users that were not in the csv file and were not admins have been deleted.
      And I check the classes and see they all were cleared and only the users the csv contains are now there.

CSV file content example (for the first row, texts not inside parenthesis may be translated) :
Username (USERNAME),Password (PASSWORD),Full name (FULL_NAME),User type (USER_TYPE),Identifier (IDENTIFIER),Birth year (BIRTH_YEAR),Gender (GENDER),Enrolled in (ENROLLED_IN),Assigned to (ASSIGNED_TO)
jkrowling,,Too bad to be here,STUDENT,Potter1,1899,FEMALE,Literature 0,
ignored_data,,You are not a coach,LEARNER,,,,,Ignored class
new_coach,,Miguel de Cervantes,COACH,Sancho1,1969,MALE,,Literature 1
student1,,William Shakespeare,LEARNER,Otelo1,2001,MALE,Literature 1,
student2,,Agatha Christie,LEARNER,Poirot1,1999,FEMALE,"Literature 1,Chemistry2",
