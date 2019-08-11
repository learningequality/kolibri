import Vue from 'vue';

const globalState = Vue.observable({
  modality: null, // track whether the user is navigating with the keyboard or not
});

export default globalState;
