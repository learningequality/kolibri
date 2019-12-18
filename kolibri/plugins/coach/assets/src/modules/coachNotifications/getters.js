import orderBy from 'lodash/orderBy';
import groupBy from 'lodash/groupBy';
import get from 'lodash/get';
import find from 'lodash/find';
import maxBy from 'lodash/maxBy';
import { NotificationObjects } from '../../constants/notificationsConstants';
import { CollectionTypes } from '../../constants/lessonsConstants';
import { partitionCollectionByEvents, getCollectionsForAssignment } from './gettersUtils';

const { LESSON, RESOURCE, QUIZ } = NotificationObjects;

export function summarizedNotifications(state, getters, rootState, rootGetters) {
  const summaryEvents = [];
  const classSummary = rootGetters['classSummary/notificationModuleData'];

  // Group notifications by certain shared values
  // Resource Completed/Needs Help - Same Node and Lesson
  // Lesson/Quiz Completed - Same Lesson/Quiz
  const groupedNotifications = groupBy(state.notifications, n => {
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

    const { object, type, event } = firstEvent;

    // Set details about Lesson or Quiz
    let assignment;

    if (object === RESOURCE || object === LESSON) {
      assignment = {
        id: firstEvent.lesson_id,
        type: 'lesson',
        name: firstEvent.lesson,
      };
    }

    if (object === QUIZ) {
      assignment = {
        id: firstEvent.quiz_id,
        type: 'exam', // using 'exam' here since it matches string used in ContentIcon
        name: firstEvent.quiz,
      };
    }

    // If notification is for a single Resource, set up details about it
    let resource = {};

    if (object === RESOURCE) {
      resource = {
        id: firstEvent.contentnode_id,
        content_id: get(classSummary.contentNodes, [firstEvent.contentnode_id, 'content_id'], ''),
        type: firstEvent.contentnode_kind,
        name: firstEvent.resource,
      };
    }

    const assigneeCollections = getCollectionsForAssignment({
      classSummary,
      assignment,
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

      // Ad hoc groups will not have notifications bundled up like
      // "Joe and N others..." for now. Each Individual learner's behavior
      // will have a notification shown.
      if (collection.collection_kind === CollectionTypes.ADHOCLEARNERSGROUP) {
        partitioning.hasEvent.forEach((userId, idx) => {
          const user = find(orderBy(allEvents, 'timestamp', ['desc']), event => {
            return event.user_id === userId;
          });
          summaryEvents.push({
            type,
            object,
            event,
            groupCode: groupCode + '_' + collIdx + '_' + idx,
            lastId,
            assignment,
            resource,
            collection: {
              id: collection.collection,
              type: collection.collection_kind,
              name: collection.name,
            },
            learnerSummary: {
              firstUserName: user.user,
              firstUserId: user.user_id,
              total: 1,
              // not used for Needs Help
              completesCollection: false,
            },
          });
        });
      } else {
        summaryEvents.push({
          type,
          object,
          event,
          groupCode: groupCode + '_' + collIdx,
          lastId,
          assignment,
          resource,
          collection: {
            id: collection.collection,
            type: collection.collection_kind,
            name: collection.name,
          },
          learnerSummary: {
            firstUserName: firstUser.user,
            firstUserId: firstUser.user_id,
            total: partitioning.hasEvent.length,
            // not used for Needs Help
            completesCollection: partitioning.rest.length === 0,
          },
        });
      }
    }
  }

  return summaryEvents;
}
