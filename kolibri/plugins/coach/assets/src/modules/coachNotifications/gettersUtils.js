import find from 'lodash/find';
import map from 'lodash/map';
import partition from 'lodash/partition';
import { CollectionTypes } from '../../constants/lessonsConstants';

// Utility functions that need to access data in 'classSummary' module
// The classSummary argument to these functions is a reference to a special
// 'coachNotificationsData' getter implemented in the 'classSummary' module.

// Paritions a collection's user ID list based on whether a user is present in
// in the events list. e.g. members of the first array are in the subset that completed
// a resource.
export function partitionCollectionByEvents({
  classSummary,
  events,
  collectionId,
  collectionType,
}) {
  // events array must be homogenous in the Object, Event, Lesson/ContentNode ID
  let partitioned;
  const { learners, learnerGroups } = classSummary;
  const eventsUserIds = map(events, 'user_id');
  const userIsInEvent = id => eventsUserIds.includes(id);

  if (collectionType === CollectionTypes.CLASSROOM) {
    partitioned = partition(map(learners, 'id'), userIsInEvent);
  } else {
    const match = find(learnerGroups, { id: collectionId });
    // If no match, Learner Group must have been deleted
    if (!match) return null;
    partitioned = partition(match.member_ids, userIsInEvent);
  }

  return {
    hasEvent: partitioned[0],
    rest: partitioned[1],
  };
}

// Returns a Maybe [{ collection_kind, collection }] object, given a lessonId.
// Returns null when lesson has been deleted.
export function getCollectionsForAssignment({ classSummary, assignment }) {
  let collections = [];
  const { id: assignmentId, type: assignmentType } = assignment;
  const { exams, lessons, classId, className, learnerGroups } = classSummary;
  let assignmentMatch;
  if (assignmentType === 'lesson') {
    assignmentMatch = find(lessons, { id: assignmentId });
  } else {
    assignmentMatch = find(exams, { id: assignmentId });
  }

  // If lesson or exam wasn't found in classSummary, then it was probably deleted.
  if (!assignmentMatch) return null;

  const { groups } = assignmentMatch;

  if (groups.length === 1 && groups[0] === classId) {
    // Matches the shape of the Collection API
    collections.push({
      collection_kind: CollectionTypes.CLASSROOM,
      collection: classId,
      name: className,
    });
  } else {
    groups.forEach(groupId => {
      const groupMatch = find(learnerGroups, { id: groupId });
      if (groupMatch) {
        collections.push({
          collection_kind: CollectionTypes.LEARNERGROUP,
          collection: groupMatch.id,
          name: groupMatch.name,
        });
      }
    });
  }

  return collections;
}
