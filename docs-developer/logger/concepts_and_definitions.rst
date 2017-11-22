Concepts and Definitions
========================

Content Interaction Log
-----------------------
This Model provides a record of an interaction with a content item. As such, it
should encode the channel that the content was in, and the id of the content.
Further, it may be required to encode arbitrary data in a JSON blob that is
specific to the particular content type.

As a typical use case, a ContentInteractionLog object might be used to record
an interaction with one instance of an exercise (i.e. one question, but possibly
multiple attempts within the same session), or a single session of viewing a video.

Finally, these Logs will use MorangoDB to synchronize their data across devices.


Content Summary Log
-------------------
This Model provides a summary of all interactions of a user with a content item.
As such, it should encode the channel that the content was in, and the id of
the content. Further, it may be required to encode arbitrary data in a JSON blob
that is specific to the particular content type.

As a typical use case, a ContentSummaryLog object might be used to provide
summary data about the state of completion of a particular exercise, video, or
other content.

When a new InteractionLog is saved, the associated SummaryLog is updated at the
same time. This means that the SummaryLog acts as an aggregation layer for the
current state of progress for a particular piece of content.

To implement this, a content viewer app would define the aggregation function
that summarizes interaction logs into the summary log. While this could happen
in the frontend, it would probably be more efficient for this to happen on the
server side.

Finally, these Logs will use MorangoDB to synchronize their data across
devices - in the case where two summary logs from  different devices conflict,
then the aggregation logic would be applied across all interaction logs to
create a consolidated summary log.


Content Rating Log
------------------
This Model provides a record of user feedback on content.

As a typical use case, a ContentRatingLog object might be used to record user
feedback data about any content.

Finally, these Logs will use MorangoDB to synchronize their data across devices.

User Session Log
----------------
This Model provides a record of an user session in Kolibri. As such, it should
encode the channels interacted with, the length of time engaged, and the pages
visited.

As a typical use case, a UserSessionLog object might be used to record which
pages a user visits, and how long the user is logged on for.

Finally, these Logs will use MorangoDB to synchronize their data across devices.
