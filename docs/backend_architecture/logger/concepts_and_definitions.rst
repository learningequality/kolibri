Concepts and definitions
========================

All logs use MorangoDB to synchronize their data across devices.


Content session logs
--------------------

These models provide a high-level record that a user interacted with with a content item
for some contiguous period of time. This generally corresponds to the time between when
a user navigates to the content and when they navigate away from it.

Specifically, it encodes the channel that the content was in, the id of the content,
which user it was, and time-related date. It may also encode additional data that is
specific to the particular content type in a JSON blob.

As a typical use case, a ContentSessionLog object might be used to record high-level
information about how long a user engaged with an exercise or a video during a single
viewing. More granular interaction information about what happened within the session
may be stored in another model such as an attempt log, below.


Content summary logs
--------------------

These models provide an aggregate summary of all interactions of a user with a
content item. It encodes the channel that the content was in, the id of
the content, and information such as cummulative time spent. It may also encode
additional data specific to the particular content type in a JSON blob.

As a typical use case, a ContentSummaryLog object might be used to provide
summary data about the state of completion of a particular exercise, video, or
other content.

When a new ContentSessionLog is saved, the associated ContentSummaryLog is updated at the
same time. This means that the ContentSummaryLog acts as an aggregation layer for the
progress of a particular piece of content.

To implement this, a content viewer app would define the aggregation function
that summarizes session logs into the summary log. While this could happen
in the frontend, it would probably be more efficient for this to happen on the
server side.

These logs will use MorangoDB to synchronize their data across
devices - in the case where two summary logs from  different devices conflict,
then the aggregation logic would be applied across all interaction logs to
create a consolidated summary log.


Attempt logs
------------

These models store granular information about a user's interactions with individual
components of some kind of assessment. There are two subclasses: AttemptLog which tracks
attempts at questions within exercises, and ExamAttemptLog which tracks attempts at
questions within exams.


Exam logs
---------

These models provide information about when users took exams.


User session logs
-----------------

These models provide a record of a user session in Kolibri. It encodes the channels
interacted with, the length of time engaged, and the specific pages visited.

Concretely, a UserSessionLog records which pages a user visits and how long the user
is logged in for.

