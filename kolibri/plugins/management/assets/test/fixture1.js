const johnDuck = {
  id: 2,
  first_name: 'John',
  last_name: 'Duck',
  username: 'jduck',
};

export default {
  learners: [
    {
      id: 1,
      first_name: 'Mike',
      last_name: 'G',
      username: 'mike',
    },
    johnDuck,
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
      learners: [1, 3],
    },
    {
      id: 2,
      name: 'Classroom B',
      learners: [3],
    },
    {
      id: 3,
      name: 'Classroom C',
      learners: [2],
    },
  ],
};
