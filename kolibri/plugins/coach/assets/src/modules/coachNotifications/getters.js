import orderBy from 'lodash/orderBy';
import groupBy from 'lodash/groupBy';
import find from 'lodash/find';
import sortedUniqBy from 'lodash/sortedUniqBy';
import { ContentNodeKinds } from 'kolibri/constants';
import { NotificationObjects, NotificationEvents } from '../../constants/notificationsConstants';
import { CollectionTypes } from '../../constants/lessonsConstants';

const { LESSON, RESOURCE, QUIZ } = NotificationObjects;

export function allNotifications(state, getters, rootState, rootGetters) {
  const classSummary = rootGetters['classSummary/notificationModuleData'];

  function getResource(contentnode_id) {
    if (classSummary.contentNodes[contentnode_id]) {
      return {
        name: classSummary.contentNodes[contentnode_id].title,
        type: classSummary.contentNodes[contentnode_id].kind,
        id: contentnode_id,
        content_id: classSummary.contentNodes[contentnode_id].content_id,
      };
    }
    return {
      name: '',
      type: '',
      id: contentnode_id,
      content_id: '',
    };
  }

  function reshapeNotification(notification) {
    // Discard notifications for users that we have no info for
    if (!classSummary.learners[notification.user_id]) {
      return null;
    }

    const { object } = notification;
    // Finds the first group the user_id is in and just uses that label.
    // Does not make additional notifications if the user is in more than
    // one group that has been assigned lesson or quiz.
    if (object === QUIZ) {
      const examMatch = classSummary.exams[notification.quiz_id];
      if (!examMatch) {
        return null;
      }
    } else if (object === LESSON || object === RESOURCE) {
      const lessonMatch = classSummary.lessons[notification.lesson_id];
      if (!lessonMatch) {
        return null;
      }
    }
    const groups = notification.assignment_collections
      .map(idx => classSummary.learnerGroups[idx])
      .filter(Boolean);

    let collection;
    if (!groups.length) {
      collection = {
        id: classSummary.classId,
        name: classSummary.className,
        type: CollectionTypes.CLASSROOM,
      };
    } else {
      const groupMatch =
        find(groups, group => {
          return group.member_ids.includes(notification.user_id);
          // If the learner was removed from all groups, generate the notification for
          // the first group
        }) || groups[0];
      collection = {
        id: groupMatch.id,
        name: groupMatch.name,
        type: CollectionTypes.LEARNERGROUP,
      };
    }

    let assignment = {};
    if (object === QUIZ) {
      assignment = {
        name: classSummary.exams[notification.quiz_id].title,
        type: ContentNodeKinds.EXAM,
        id: notification.quiz_id,
      };
    } else {
      assignment = {
        name: classSummary.lessons[notification.lesson_id].title,
        type: ContentNodeKinds.LESSON,
        id: notification.lesson_id,
      };
    }

    return {
      ...notification,
      object,
      collection,
      id: Number(notification.id),
      assignment,
      resource: getResource(notification.contentnode_id),
      learnerSummary: {
        firstUserName: classSummary.learners[notification.user_id].name,
        firstUserId: notification.user_id,
        total: 1,
      },
    };
  }

  return orderBy(
    state.notifications.map(reshapeNotification).filter(n => n),
    'timestamp',
    ['desc'],
  );
}

export function summarizedNotifications(state, getters, rootState, rootGetters) {
  const summaryEvents = [];
  const classSummary = rootGetters['classSummary/notificationModuleData'];

  // Group notifications by certain shared values
  // Resource Completed/Needs Help - Same Node and Lesson
  // Lesson/Quiz Completed - Same Lesson/Quiz
  const groupedNotifications = groupBy(
    getters.allNotifications.filter(
      // Filter out "Answered" notifications to avoid flooding the list
      n => n.event !== NotificationEvents.ANSWERED,
    ),
    n => {
      if (n.object === RESOURCE) {
        // Contains both Needs Help and Resource Completed-typed notifications
        return `${n.object}_${n.lesson_id}_${n.contentnode_id}`;
      }
      if (n.object === LESSON) {
        return `${n.object}_${n.lesson_id}`;
      }
      if (n.object === QUIZ) {
        return `${n.object}_${n.quiz_id}`;
      }
    },
  );

  for (const groupCode in groupedNotifications) {
    // Filter out all but the most recent event for each user
    const allEvents = sortedUniqBy(groupedNotifications[groupCode], 'user_id');

    const eventsByCollection = groupBy(allEvents, e => e.collection.id);

    // Iterate through each of the assignee collections and create one
    // summarizing notification for each event type in the collection.
    for (const collIdx in eventsByCollection) {
      const collectionEvents = eventsByCollection[collIdx];

      const eventTypeEvents = groupBy(collectionEvents, 'event');

      for (const eventType in eventTypeEvents) {
        const orderedEvents = eventTypeEvents[eventType];

        const lastEvent = orderedEvents[0];

        let collectionSize = 1;

        if (lastEvent.collection.type === CollectionTypes.CLASSROOM) {
          collectionSize = classSummary.learners.length;
        } else if (lastEvent.collection.type === CollectionTypes.LEARNERGROUP) {
          collectionSize = classSummary.learnerGroups[collIdx].member_ids.length;
        } else if (lastEvent.collection.type === CollectionTypes.ADHOCLEARNERSGROUP) {
          collectionSize = classSummary.adHocGroupsMap[collIdx].length;
        }

        summaryEvents.push({
          ...lastEvent,
          groupCode: groupCode + '_' + collIdx,
          timestamp: lastEvent.timestamp,
          learnerSummary: {
            ...lastEvent.learnerSummary,
            total: orderedEvents.length,
            // not used for Needs Help
            completesCollection: orderedEvents.length === collectionSize,
          },
        });
      }
    }
  }

  return orderBy(summaryEvents, 'timestamp', ['desc']);
}
