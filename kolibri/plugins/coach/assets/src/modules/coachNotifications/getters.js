import orderBy from 'lodash/orderBy';
import groupBy from 'lodash/groupBy';
import find from 'lodash/find';
import maxBy from 'lodash/maxBy';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { NotificationObjects } from '../../constants/notificationsConstants';
import { CollectionTypes } from '../../constants/lessonsConstants';
import { partitionCollectionByEvents, getCollectionsForAssignment } from './gettersUtils';

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
    let groups;
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
    let collection;
    if (groups) {
      collection = {
        id: classSummary.classId,
        name: classSummary.className,
        type: CollectionTypes.CLASSROOM,
      };
    } else {
      const groupMatch = find(groups, groupId => {
        const found = classSummary.learnerGroups[groupId];
        if (found) {
          return found.member_ids.includes(notification.user_id);
        }
        return false;
      });
      if (groupMatch) {
        collection = {
          id: classSummary.learnerGroups[groupMatch].id,
          name: classSummary.learnerGroups[groupMatch].name,
          type: CollectionTypes.LEARNERGROUP,
        };
      } else {
        // If learner group was deleted, then just give it the header
        // for the whole class
        collection = {
          id: classSummary.classId,
          name: classSummary.className,
          type: CollectionTypes.CLASSROOM,
        };
      }
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

  return state.notifications.map(reshapeNotification).filter(n => n);
}

export function summarizedNotifications(state, getters, rootState, rootGetters) {
  const summaryEvents = [];
  const classSummary = rootGetters['classSummary/notificationModuleData'];

  // Group notifications by certain shared values
  // Resource Completed/Needs Help - Same Node and Lesson
  // Lesson/Quiz Completed - Same Lesson/Quiz
  const groupedNotifications = groupBy(getters.allNotifications, n => {
    if (n.object === RESOURCE) {
      // Contains both Needs Help and Resource Completed-typed notifications
      return `${n.type}_${n.lesson_id}_${n.contentnode_id}`;
    }
    if (n.object === LESSON) {
      return `${n.type}_${n.lesson_id}`;
    }
    if (n.object === QUIZ) {
      return `${n.type}_${n.quiz_id}`;
    }
  });

  for (let groupCode in groupedNotifications) {
    const allEvents = groupedNotifications[groupCode];

    // Use first event in list as exemplar for summary object
    const firstEvent = allEvents[0];

    // Get the ID of the most recent event in the collection
    const lastId = maxBy(allEvents, n => Number(n.id)).id;

    const assigneeCollections = getCollectionsForAssignment({
      classSummary,
      assignment: firstEvent.assignment,
    });
    // If 'assigneeCollections' is null, then the quiz or lesson was deleted
    if (assigneeCollections === null) continue;

    // Iterate through each of the assignee collections and create one
    // summarizing notification for each.
    for (let collIdx in assigneeCollections) {
      const collection = assigneeCollections[collIdx];

      const partitioning = partitionCollectionByEvents({
        classSummary,
        events: allEvents,
        collectionId: collection.collection,
        collectionType: collection.collection_kind,
      });

      // If 'partitioning' is null, then the assignee collection is a learnergroup
      // that has been deleted.
      if (partitioning === null || partitioning.hasEvent.length === 0) continue;

      const firstUser = find(orderBy(allEvents, 'timestamp', ['desc']), event => {
        return partitioning.hasEvent.includes(event.user_id);
      });

      summaryEvents.push({
        ...firstEvent,
        groupCode: groupCode + '_' + collIdx,
        lastId,
        collection: {
          id: collection.collection,
          type: collection.collection_kind,
          name: collection.name,
        },
        learnerSummary: {
          ...firstUser.learnerSummary,
          total: partitioning.hasEvent.length,
          // not used for Needs Help
          completesCollection: partitioning.rest.length === 0,
        },
      });
    }
  }

  return summaryEvents;
}
