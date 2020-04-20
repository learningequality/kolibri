Feature: Super Admin export users for a facility in a device with manage bulkexportusers command
    Super Admin needs to be able to export a list of the users and classes, with the information to enroll or assign coaches to the classes

  Background:
    Given that the Kolibri server has one device with one or more facilities
      And Kolibri translations for the related strings are done

  Scenario: Execute the bulkexportusers command and review the created "users_<date>_<time>.csv" file
    When I run the 'kolibri manage bulkexportusers --overwrite --output-file=test.csv ' command in the Terminal
      And I browse the folder where I executed the command
    Then I see a "users_<date>_<time>.csv" file # <date> is current date and <time> current time, for example users_20200420_194415.csv
    Then I open the file with a text editor or with a spreadsheet application
      And I see one row per user in the current facility, containing the user info and the classes where (s)he's enrolled or the classes (s)he's assigned to if (s)he's a coach

  Scenario: Execute the bulkexportusers command and review the header in the output file is translated
    When I run the 'kolibri manage bulkexportusers --overwrite --output-file=test.csv --locale=es_ES' command in the Terminal
      And I browse the folder where I executed the command
    Then I see a "users_<date>_<time>.csv" file # <date> is current date and <time> current time, for example users_20200420_194415.csv
    Then I open the file with a text editor or with a spreadsheet application
      And I see the header has the field names translated, including the fieldname in capital letters in parenthesis. Example *Identificador (IDENTIFIER)*
