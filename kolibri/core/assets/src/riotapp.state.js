'use strict';

// load dependencies
var riot = require('riot');


/*
  The application state is just an object
  with some event publishing capability.
*/
var state = {};
riot.observable(state);


/* classrooms
A list of objects with keys:
  `name` - string
  `students` - list of references to users

Here we hard-code a couple classrooms.
*/
state.classrooms = [
  {name: 'Class 1', students: []},
  {name: 'Class 2', students: []},
];


/* users
A list of objects with keys:
  `username` - string
  `fullname` - string
*/
state.users = [
  {username: 'user1234', fullname: 'Some Name'},
];


/* editorState
Used to control the edit pop-up.
*/
state.editorState = {
  visible: false,    // is the pop-up shown?
  username: null,   // set username when used in 'edit' mode
  fullname: '',     // initial value
};


// add some more dummy data
state.classrooms[1].students.push(state.users[0]);
state.classrooms[1].students.push(state.users[0]);
state.classrooms[1].students.push(state.users[0]);


// module API
module.exports = state;
