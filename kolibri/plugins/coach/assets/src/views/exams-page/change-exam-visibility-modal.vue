<template>

  <core-modal :title="$tr('examVisibility')" @cancel="close">
    <p v-html="$trHtml('shouldBeVisible', { examTitle })"></p>
    <label>
      <input type="radio" :value="true" v-model="classIsSelected" @change="deselectGroups">
      <span v-html="$trHtml('entireClass', { className })"></span>
    </label>
    <ui-select
      :name="$tr('group')"
      :label="$tr('specificGroups')"
      :placeholder="$tr('selectGroups')"
      :multiple="true"
      :options="groupOptions"
      v-model="groupsSelected"
      @change="handleSelectChange"
    />
    <div class="footer">
      <icon-button :text="$tr('cancel')" @click="close"/>
      <icon-button :text="$tr('update')" :primary="true" @click="updateVisibility"/>
    </div>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');
  const CollectionKinds = require('kolibri.coreVue.vuex.constants').CollectionKinds;

  module.exports = {
    $trNameSpace: 'changeExamVisibilityModal',
    $trs: {
      examVisibility: 'Exam visibility',
      shouldBeVisible: '<strong>{ examTitle }</strong> should be visible to:',
      group: 'group',
      specificGroups: 'Specific groups',
      selectGroups: 'Select groups',
      entireClass: 'Entire { className } class',
      cancel: 'Cancel',
      update: 'Update',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-select': require('keen-ui/src/UiSelect'),
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
        classIsSelected: this.classInitiallySelected(),
        groupsSelected: this.initiallySelectedGroups(),
      };
    },
    computed: {
      groupOptions() {
        return this.classGroups.map(group => ({ label: group.name, id: group.id }));
      },
    },
    methods: {
      classInitiallySelected() {
        if (this.examVisibility.class) {
          return true;
        }
        return false;
      },
      initiallySelectedGroups() {
        return this.examVisibility.groups.map(
            group => ({ label: group.collection.name, id: group.collection.id }));
      },
      handleSelectChange() {
        this.classIsSelected = !this.groupsSelected.length;
      },
      deselectGroups() {
        this.groupsSelected = [];
      },
      updateVisibility() {
        if (this.classIsSelected) {
          if (this.classIsSelected === this.classInitiallySelected()) {
            this.close();
            return;
          }
          const classCollection = [{
            id: this.classId,
            name: this.className,
            kind: CollectionKinds.CLASSROOM
          }];
          const groupAssignments = this.examVisibility.groups.map(
            assignment => assignment.assignmentId);
          this.updateExamAssignments(this.examId, classCollection, groupAssignments);
        } else if (this.groupsSelected.length) {
          const unassignGroups = this.initiallySelectedGroups().filter(
              initialGroup => !this.groupsSelected.find(newGroup => newGroup.id === initialGroup.id));
          const assignGroups = this.groupsSelected.filter(
              newGroup => !this.initiallySelectedGroups().find(
                  initialGroup => initialGroup.id === newGroup.id));

          if (!unassignGroups.length && !assignGroups.length) {
            this.close();
            return;
          }
          const assignGroupCollections = assignGroups.map(group => ({
            id: group.id,
            name: group.label,
            kind: CollectionKinds.LEARNERGROUP,
          }));
          let unassignments = unassignGroups.map(unassignGroup => this.examVisibility.groups.find(
            group => group.collection.id === unassignGroup.id).assignmentId);
          if (this.examVisibility.class) {
            unassignments = unassignments.concat(this.examVisibility.class.assignmentId);
          }
          this.updateExamAssignments(this.examId, assignGroupCollections, unassignments);
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        displayModal: examActions.displayModal,
        updateExamAssignments: examActions.updateExamAssignments,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  label
    display: block

  .footer
    text-align: center
    button
      min-width: 45%

</style>
