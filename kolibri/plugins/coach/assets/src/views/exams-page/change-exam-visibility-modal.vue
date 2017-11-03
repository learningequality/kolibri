<template>

  <core-modal :title="$tr('examVisibility')" @cancel="close">
    <p>{{ $tr('shouldBeVisible', { examTitle }) }}</p>
    <k-radio-button
      :label="$tr('entireClass', { className })"
      :radiovalue="true"
      v-model="classIsSelected"
      @change="deselectGroups"
    />
    <k-checkbox
      v-for="group in classGroups"
      :key="group.id"
      :label="group.name"
      :checked="groupIsSelected(group.id)"
      @change="handleGroupChange(group.id, $event)"
    />
    <div class="footer">
      <k-button :text="$tr('cancel')" appearance="flat-button" @click="close" />
      <k-button :text="$tr('update')" :primary="true" :disabled="busy" @click="updateVisibility" />

    </div>
  </core-modal>

</template>


<script>

  import { displayExamModal, updateExamAssignments } from '../../state/actions/exam';
  import { CollectionKinds } from 'kolibri.coreVue.vuex.constants';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  export default {
    name: 'changeExamVisibilityModal',
    $trs: {
      examVisibility: 'Change exam visibility',
      shouldBeVisible: "Make '{ examTitle }' visible to entire class or specific groups",
      group: 'group',
      selectGroups: 'Select groups',
      entireClass: 'Entire { className } class',
      cancel: 'Cancel',
      update: 'Update',
    },
    components: {
      coreModal,
      kButton,
      kRadioButton,
      kCheckbox,
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
        classIsSelected: this.classIsInitiallySelected(),
        selectedGroups: this.initiallySelectedGroups(),
      };
    },
    methods: {
      classIsInitiallySelected() {
        if (this.examVisibility.class) {
          return true;
        }
        return false;
      },

      initiallySelectedGroups() {
        return this.examVisibility.groups.map(group => group.collection.id);
      },

      deselectGroups() {
        this.selectedGroups = [];
      },

      groupIsSelected(groupId) {
        return this.selectedGroups.includes(groupId);
      },

      handleGroupChange(groupId, isSelected) {
        if (isSelected) {
          if (!this.selectedGroups.includes(groupId)) {
            this.selectedGroups.push(groupId);
          }
        } else {
          this.selectedGroups = this.selectedGroups.filter(group => group !== groupId);
        }
        this.classIsSelected = !this.selectedGroups.length;
      },

      getGroupName(groupId) {
        return this.classGroups.find(group => group.id === groupId).name;
      },

      updateVisibility() {
        if (this.classIsSelected) {
          if (this.classIsSelected === this.classIsInitiallySelected()) {
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
        } else if (this.selectedGroups.length) {
          const unassignGroups = this.initiallySelectedGroups().filter(
            initialGroup => !this.selectedGroups.includes(initialGroup)
          );
          const assignGroups = this.selectedGroups.filter(
            newGroup => !this.initiallySelectedGroups().includes(newGroup)
          );
          if (!unassignGroups.length && !assignGroups.length) {
            this.close();
            return;
          }
          const assignGroupCollections = assignGroups.map(group => ({
            id: group,
            name: this.getGroupName(group),
            kind: CollectionKinds.LEARNERGROUP,
          }));
          let unassignments = unassignGroups.map(
            unassignGroup =>
              this.examVisibility.groups.find(group => group.collection.id === unassignGroup)
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
        displayExamModal,
        updateExamAssignments,
      },
      getters: {
        busy: state => state.pageState.busy,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  label
    display: block

  .footer
    text-align: right

  .group-select
    padding-bottom: 4rem

  >>>.ui-select__options
    max-height: 5rem

</style>
