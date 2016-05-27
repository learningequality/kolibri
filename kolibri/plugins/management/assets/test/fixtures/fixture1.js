module.exports = {
  learners: [
    {
      id: 1,
      first_name: 'Mike',
      last_name: 'G',
      username: 'mike',
    },
    {
      id: 2,
      first_name: 'John',
      last_name: 'Duck',
      username: 'jduck',
    },
    {
      id: 3,
      first_name: 'Abe',
      last_name: 'Lincoln',
      username: 'abe',
    },
    {
      id: 4,
      first_name: 'Harriet',
      last_name: 'Tubman',
      username: 'htub',
    },
  ],
  classrooms: [
    {
      id: 1,
      name: 'Classroom A',
      learnerGroups: [1, 3],
      ungroupedLearners: [],
      // learners: [1, 2, 3],
    },
    {
      id: 2,
      name: 'Classroom B',
      learnerGroups: [],
      ungroupedLearners: [],
    },
    {
      id: 3,
      name: 'Classroom C',
      learnerGroups: [2],
      ungroupedLearners: [],
      // learners: [2],
    },
    {
      id: 4,
      name: 'Classroom with ungrouped learners',
      learnerGroups: [],
      ungroupedLearners: [4],
      // learners: [4],
    },
  ],
  learnerGroups: [
    {
      id: 1,
      name: 'Group 1',
      learners: [1, 2],
    },
    {
      id: 2,
      name: 'Group 2',
      learners: [2],
    },
    {
      id: 3,
      name: 'Group 3',
      learners: [3],
    },
  ],
  selectedClassroomId: null, // `null` a special meaning for this app.
  selectedGroupId: 'nogroups', // also has a special meaning for this app
};
