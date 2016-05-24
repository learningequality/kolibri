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
  ],
  classrooms: [
    {
      id: 1,
      name: 'Classroom A',
      learnerGroups: [1, 3],
      // learners: [1, 2, 3],
    },
    {
      id: 2,
      name: 'Classroom B',
      learnerGroups: [],
    },
    {
      id: 3,
      name: 'Classroom C',
      learnerGroups: [2],
      // learners: [2],
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
};
