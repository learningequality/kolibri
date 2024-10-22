Feature: Coaches need to be able to print or save as PDF all the available views inside the *Lessons* page

  Background:
    Given I am signed in as a facility or class coach
      And I am at the *Coach > <class> > Lessons* page
      And there are lessons with which some of the learners have interacted
      And I have access to a working printer
      And my browser is capable of saving pages as PDF files

  Scenario: Print report for all lessons
    When I click the *Print report* button
    Then I see the default print dialog for my chosen browser
    When I select my paper printer device
      And I make other adjustments in the printer settings according to my needs # quality, margins, etc.
      And I confirm # could be *Print* or *OK* depending on the browser
    Then I can print a paper version of the report #repeat the same scenario for the lesson summary page, the resource details page, the learners tab and the learner's details page

  Scenario: Save report for all lessons as a PDF
    When I click the *Print report* button
    Then I see the default print dialog for my chosen browser
    When I select *Save as PDF* # wording might be different depending on the browser
        And I make other adjustments in the PDF settings according to my needs # headings, margins, etc.
        And I confirm # could be *Save* or *OK* depending on the browser
    Then I have a PDF version of the report #repeat the same scenario for the lesson summary page, the resource details page, the learners tab and the learner's details page
