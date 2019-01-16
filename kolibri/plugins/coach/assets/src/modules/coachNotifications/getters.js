import groupBy from 'lodash/groupBy';
import find from 'lodash/find';
import map from 'lodash/map';
import max from 'date-fns/max';

import { partitionCollectionByEvents, getCollectionsForAssignment } from './gettersUtils';

export function summarizedNotifications(state, getters, rootState, rootGetters) {
  const summaryEvents = [];
  const classSummary = rootGetters['classSummary/notificationModuleData'];

  // Group notifications by certain shared values
  // Resource Completed/Needs Help - Same Node and Lesson
  // Lesson/Quiz Completed - Same Lesson/Quiz
  const groupedNotifications = groupBy(state.notifications, n => {
    if (n.object === 'Resource') {
      // Contains both Needs Help and Resource Completed-typed notifications
      return `${n.type}_${n.lesson_id}_${n.contentnode_id}`;
    }
    if (n.object === 'Lesson') {
      return `${n.type}_${n.lesson_id}`;
    }
    if (n.object === 'Quiz') {
      return `${n.type}_${n.quiz_id}`;
    }
  });

  for (let groupCode in groupedNotifications) {
    const allEvents = groupedNotifications[groupCode];

    // Use first event in list as exemplar for summary object
    const firstEvent = allEvents[0];

    // Get the timestamp of the most recent event in the collection
    const lastTimestamp = max.apply(null, map(allEvents, 'timestamp'));

    const { object, type, event } = firstEvent;

    // Set details about Lesson or Quiz
    let assignment;

    if (object === 'Resource' || object === 'Lesson') {
      assignment = {
        id: firstEvent.lesson_id,
        type: 'lesson',
        name: firstEvent.lesson,
      };
    }

    if (object === 'Quiz') {
      assignment = {
        id: firstEvent.quiz_id,
        type: 'quiz',
        name: firstEvent.quiz,
      };
    }

    // If notification is for a single Resource, set up details about it
    let resource = {};

    if (object === 'Resource') {
      resource = {
        id: firstEvent.contentnode_id,
        type: firstEvent.contentnode_kind,
        name: firstEvent.resource,
      };
    }

    const assigneeCollections = getCollectionsForAssignment({
      classSummary,
      assignment,
    });

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

      summaryEvents.push({
        type,
        object,
        event,
        lastTimestamp,
        assignment,
        resource,
        collection: {
          id: collection.collection,
          type: collection.collection_kind,
          name: collection.name,
        },
        learnerSummary: {
          firstUserName: find(allEvents, { user_id: partitioning.hasEvent[0] }).user,
          total: partitioning.hasEvent.length,
          completesCollection: partitioning.rest.length === 0, // not used for Needs Help
        },
      });
    }

    // If 'assigneeCollections' is null, it means the assignment was deleted
    if (assigneeCollections === null) continue;
  }

  return summaryEvents;
}
