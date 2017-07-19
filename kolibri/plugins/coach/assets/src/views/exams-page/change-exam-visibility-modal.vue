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
      class="group-select"
    />
    <div class="footer">
      <k-button :text="$tr('cancel')" :raised="false" @click="close"/>
      <k-button :text="$tr('update')" :primary="true" @click="updateVisibility"/>
    </div>
  </core-modal>

</template>


<script>

  import * as examActions from '../../state/actions/exam';
  import { CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiSelect from 'keen-ui/src/UiSelect';
  export default {
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
      coreModal,
      kButton,
      uiSelect,
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
        return this.classGroups.map(group => ({
          label: group.name,
          id: group.id,
        }));
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
        return this.examVisibility.groups.map(group => ({
          label: group.collection.name,
          id: group.collection.id,
        }));
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
          const classCollection = [
            {
              id: this.classId,
              name: this.className,
              kind: CollectionKinds.CLASSROOM,
            },
          ];
          const groupAssignments = this.examVisibility.groups.map(
            assignment => assignment.assignmentId
          );
          this.updateExamAssignments(this.examId, classCollection, groupAssignments);
        } else if (this.groupsSelected.length) {
          const unassignGroups = this.initiallySelectedGroups().filter(
            initialGroup => !this.groupsSelected.find(newGroup => newGroup.id === initialGroup.id)
          );
          const assignGroups = this.groupsSelected.filter(
            newGroup =>
              !this.initiallySelectedGroups().find(initialGroup => initialGroup.id === newGroup.id)
          );
          if (!unassignGroups.length && !assignGroups.length) {
            this.close();
            return;
          }
          const assignGroupCollections = assignGroups.map(group => ({
            id: group.id,
            name: group.label,
            kind: CollectionKinds.LEARNERGROUP,
          }));
          let unassignments = unassignGroups.map(
            unassignGroup =>
              this.examVisibility.groups.find(group => group.collection.id === unassignGroup.id)
                .assignmentId
          );
          if (this.examVisibility.class) {
            unassignments = unassignments.concat(this.examVisibility.class.assignmentId);
          }
          this.updateExamAssignments(this.examId, assignGroupCollections, unassignments);
        }
      },
      close() {
        this.displayExamModal(false);
      },
    },
    vuex: {
      actions: {
        displayExamModal: examActions.displayExamModal,
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

  .group-select
    padding-bottom: 4rem

</style>


<style lang="stylus">

  .group-select
    .ui-select__options
      max-height: 5rem

</style>
