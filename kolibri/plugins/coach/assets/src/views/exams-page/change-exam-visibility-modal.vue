<template>

  <core-modal :title="$tr('examVisibility')" @cancel="close">
    <p v-html="$trHtml('shouldBeVisible', { examTitle })"></p>
    <label>
      <input type="radio" :value="true" v-model="classSelected" @change="deselectGroups">
      <span v-html="$trHtml('entireClass', { className })"></span>
    </label>
    Specific Groups
    <label v-for="group in classGroups">
      <input type="checkbox" :value="group.id" v-model="groupsSelected" @change="deselectClass">
      {{ group.name }}
    </label>
    <icon-button :text="$tr('cancel')" @click="close"/>
    <icon-button :text="$tr('update')" :primary="true" @click="updateExamVisibility"/>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'changeExamVisbilityModal',
    $trs: {
      examVisibility: 'Exam visibility',
      shouldBeVisible: '<strong>{ examTitle }</strong> should be visible to:',
      entireClass: 'Entire { className } class',
      cancel: 'Cancel',
      update: 'Update',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      examId: {
        type: String,
        required: true,
      },
      examTitle: {
        type: String,
        required: true,
      },
      examVisibility: {
        type: Object,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
      className: {
        type: String,
        required: true,
      },
      classGroups: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        classSelected: false,
        groupsSelected: [],
      };
    },
    methods: {
      deselectGroups() {
        this.groupsSelected = [];
      },
      deselectClass() {
        this.classSelected = false;
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: examActions.displayModal,
        updateExamVisibility: examActions.updateExamVisibility,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  label
    display: block

</style>
