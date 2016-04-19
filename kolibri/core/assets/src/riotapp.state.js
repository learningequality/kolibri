'use strict';

var riot = require('riot');

var state = {

  /*
  A list of objects with keys:
    `name` - string
    `students` - list of references to users
  */
  classes: [
    {name: 'Class 1', students: []},
    {name: 'Class 2', students: []},
  ],
  /*
  A list of objects with keys:
    `username` - string
    `fullname` - string
  */
  users: [
    {username: 'user1234', fullname: 'Some Name'},
  ],

  // editor state handling
  editorState: {
    visible: true,    // is the pop-up shown?
    username: null,   // set username when used in 'edit' mode
    fullname: '',     // initial value
  }

};


state.classes[1].students.push(state.users[0]);
state.classes[1].students.push(state.users[0]);
state.classes[1].students.push(state.users[0]);


riot.observable(state); // can trigger change events

window.state = state;

module.exports = state;

