.. _coach:

Coach your Learners in Kolibri
##############################
 
You can track progress of the **Learner** users, create and assign **Exams** to classes or learner groups from the **Coach** dashboard. The default view of the **Coach** dashboard presents the list of **Classes** with number of learners enrolled to each class.

Select a class from the list to access the progress-tracking features and create exams.

	.. image:: img/coach-home.png
	  :alt: default coach view with list of classes


.. _recent_view:

View Recent Activity
~~~~~~~~~~~~~~~~~~~~

This is the default view when you select a class from the **Coach** dashboard. It displays the list of channels and items (exercises and resources - videos, reading material, etc.) accessed during the last 7 days by learners of the selected class.

	.. image:: img/coach-recent.png
	  :alt: coach recent activity

If the class learners have access to more then one channel, you will first see the list of channels which you can navigate by topics and subtopics until you arrive to a specific item. In this view you can see the progress of each class learner for that specific item.


.. _topic_view:

View Activity by Topic
~~~~~~~~~~~~~~~~~~~~~~

Use this view to access the full report of activity progress for the selected class. You can navigate channels by topics and subtopics until you see the progress of each class learner for one specific item.

	.. figure:: img/topic-activity.png
	  :alt: Use the topic view to see the average progress for exercises and resources for all the learners in the class.

	  Use the topic view to see the average progress for exercises and resources for all the learners in the class.

.. _track_progress:

Track Learner Progress
----------------------

When you navigate to the last level in the topic tree, you can see the average progress of all class learners for each exercise or resource (video, document, HTML5 activity) in that particular topic.

When learner answers exercise questions in Kolibri, the progress bar below the exercise is taking into account only the most recent given answers, meaning that the learner must complete the required number of correct answers (*check marks*) **in the row** for the exercise to be considered completed.

	.. figure:: img/correct-row.png
	    :alt: If the exercise requires 5 check marks, learner must provide 5 correct answers one after another.

	    The correct answers in the image above are not in a row; this exercise will be completed only after learner gives 5 correct answers one after another.

	.. figure:: img/topic-view-detail.png
	    :alt: View average progress for a single exercise or resource in a topic.

In the example above, the progress bar for this exercise will appear as 40%, because the student has given 2 correct answers within the most recent set of 5 attempts. If this student had earlier made, for example, 20 incorrect attempts before the 4 displayed attempts, those 20 incorrect attempts don't get factored into the progress bar.

How does it looks if learner A does 5 correct answers in a row on their first try, but learner B gets 10 wrong answers in a row before giving 5 correct ones in a row? In both cases, the progress would show as 100%, and you would have to click each learner's name to access their progress report and see the attempt history.

In the figure below you can see the progress of 5 learners for the exercise **Numbers to 120** in ascending order.

	.. figure:: img/exercise-view-detail.png
	    :alt: View the progress for a single exercise or resource in a topic.

	    View the progress for a single exercise or resource in a topic.

To see the progress of a single learner, click their name. In the figure below you can see the progress of the learner **Hansen** for the exercise **Numbers to 120**. The exercise is still **In progress** as the learner has not completed the 5 correct answers in the row. You can also see that for the *Question 13* the learner has given the correct answer only on the 4th attempt, which indicates that they are still struggling with the given concept.

	.. figure:: img/learner-exercise-attempts.png
	    :alt: View the details for all the answers and attempts for a single exercise.

	    View the details for all the answers and attempts for a single exercise.

.. include:: manage/_groups.rst

.. include:: manage/_exams.rst
