Feature: Coaches need to be able to print or save as PDF all the available views inside the *Reports* tab and its subtabs

  Background: 
    Given I am signed in as a facility or class coach
      And I am on *Coach > Reports* tab
      And there are learners divided into groups <group1> and <group2> in the <class>
      And there are <quiz1> and <quiz2> that some of the learners have started and/or completed
      And there are <lesson1> and <lesson2> that some of the learners have interacted with
      And I have access to a working paper printer device
      And my browser is capable of saving files in the PDF format

  Scenario: Print report (for all)
    When I click the *Print report* button
    Then I see the default print dialog for my chosen browser
    When I select my paper printer device
      And I make other adjustments in the printer settings according to my needs # quality, margins, etc.
      And I confirm # could be *Print* or *OK* depending on the browser
    Then I have a paper version of the report

  Scenario: Save report as PDF (for all)
    When I click the *Print report* button
    Then I see the default print dialog for my chosen browser
    When I select *Save as PDF* # wording might be different depending on the browser
        And I make other adjustments in the PDF settings according to my needs # headings, margins, etc.
        And I confirm # could be *Save* or *OK* depending on the browser
      Then I have a PDF version of the report


  Scenario: Check print results for Lessons' reports

    When I print or save the report from *Reports > Lessons* subtab
    Then on the paper or PDF I see a table with *Title*, *Progress* and *Recipients* columns for <lesson1> and <lesson2>

    When I print or save the report from *Reports > Lessons > '<lesson1>' > Report* subtab
    Then on the paper/PDF I see a high level <lesson1> overview on top
      And below I see the table with the same columns and values for all the resources in the <lesson1>, as in *Reports > Lessons > '<lesson1>' > Report* subtab

    When I print or save the report from *Reports > Lessons > '<lesson1>' > Report > '<resource>'* page
      And the *View by groups* is unchecked
    Then on the paper/PDF I see a high level <resource> overview on top
      And below I see the table with the same columns and values for all the learners in the <class>, as in *Reports > Lessons > '<lesson1>' > Report > '<resource>'* page

    When I print or save the report from *Reports > Lessons > '<lesson1>' > Report > '<resource>'* page
      And the *View by groups* is checked
    Then on the paper/PDF I see a section for <group1> and section for <group2>
      And for each group section I see a high level group overview on top
      And below I see the table with the same columns and values for all the learners in the group, as in *Reports > Lessons > '<lesson1>' > Report > '<resource>'* page

    When I print or save the report from *Reports > Lessons > '<lesson1>' > Learners* subtab
    Then on the paper/PDF I see a high level <lesson1> overview on top
      And below I see the table with the same columns and values for all the learners in the <class>, as in *Reports > Lessons > '<lesson1>' > Learners* subtab

    When I print or save the report from *Reports > Lessons > '<lesson1>' > Learners > '<learner1>'* page
    Then on the paper/PDF I see a high level <learner1> overview on top
      And below I see the table with the same columns and values for all the resources in <lesson1>, as in *Reports > Lessons > '<lesson1>' > Learners > '<learner1>'* page


  Scenario: Check print results for Quizzes' reports

    When I print or save the report from *Reports > Quizzes* subtab
    Then on the paper/PDF I see a table with *Title*, *Average score*, *Progress* and *Recipients* columns for <quiz1> and <quiz2>

    When I print or save the report from *Reports > Quizzes > '<quiz1>' > Report* subtab 
    Then on the paper/PDF I see a high level <quiz1> overview on top
      And below I see the table with the same columns and values for all the learners in the <class>, as in *Reports > Quizzes > '<quiz1>' > Report* subtab

    When I print or save the report from *Reports > Quizzes > '<quiz1>' > Difficult questions* subtab 
    Then on the paper/PDF I see a high level <quiz1> overview on top
      And below I see the table with the same columns and values for all the questions in <quiz1> that at least 2 learners gave incorrect answers to, as in *Reports > Quizzes > '<quiz1>' > Difficult questions* subtab


  Scenario: Check print results for Groups' reports

    When I print or save the report from *Reports > Groups* subtab
    Then on the paper/PDF I see a table with the same columns and values for <group1> and <group2>, as in *Reports > Groups* subtab

    When I print or save the report from *Reports > Groups > '<group1>' > Reports> '<lesson1>'* page
    Then on the paper/PDF I see a table with the same columns and values for resources in <lesson1> assigned to <group1>, as in *Reports > Groups > '<group1>' > Reports> '<lesson1>'* page

    When I print or save the report from *Reports > Groups > '<group1>' > Reports> '<quiz1>' > Report* subtab
    Then on the paper/PDF I see a high level <quiz1> overview on top
      And below I see a table with the same columns and values for all the learners in <group1> that <quiz1> is assigned to, as in *Reports > Groups > '<group1>' > Reports> '<quiz1>' > Report* subtab

    When I print or save the report from *Reports > Groups > '<group1>' > Reports> '<quiz1>' > Difficult questions* subtab
    Then on the paper/PDF I see a high level <quiz1> overview on top
      And below I see a table with the same columns and values for all the questions in <quiz1> that at least 2 learners gave incorrect answers to, as in *Reports > Groups > '<group1>' > Reports> '<quiz1>' > Difficult questions* subtab

    When I print or save the report from *Reports > Groups > '<group1>' > Members* subtab
    Then on the paper/PDF I see a table with the same columns and values for all the learners in <group1>, as in *Reports > Groups > '<group1>' > Members* subtab

  # Reports printed from *Reports > Groups > '<group1>' > Members > '<learnerN>'* pages are the same as *Reports > Learners > '<learnerN>'* pages

  Scenario: Check print results for Learners' reports

    When I print or save the report from *Reports > Learners* subtab
    Then on the paper/PDF I see a table with the same columns and values for all the learners in the <class>, as in *Reports > Learners* subtab

    When I print or save the report from *Reports > Learners > '<learner1>' > Reports* subtab
    Then on the paper/PDF I see a high level <learner1> overview on top
      And below I see table(s) for lesson(s) and quizzes they have been assigned, with the same columns and values as in *Reports > Learners > '<learner1>' > Reports* subtab

  # Reports printed from *Reports > Learners > '<learnerN>' > '<lessonN>'* pages are essentially the same as *Reports > Lessons > '<lessonN>' > Learners > '<learnerN>'* pages
