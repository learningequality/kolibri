Feature: Super Admin export users for a facility in a device with manage bulkexportusers command
    Super Admin needs to be able to generate and review profile logs on the device running Kolibri

  Background:
    Given that the Kolibri server has one device with one or more facilities

  Scenario: Execute the bulkexportusers command and review the created "users_<date>_<time>.csv" file
    When I run the 'kolibri manage bulkexportusers --overwrite --output-file=test.csv ' command in the Terminal
      And I browse the folder where I executed the command
    Then I see a "users_<date>_<time>.csv" file # <date> is current date and <time> current time, for example users_20200420_194415.csv
    Then I open the file with a text editor or with a spreadsheet application
      And I see one row per user in the current facility, containing the user info and the classes where (s)he's enrolled or the classes (s)he's assigned to if (s)he's a coach
