<template>

  <tr>
    <td class="col-icon">
      <ui-icon
        icon="assignment"
        :ariaLabel="String(examActive)"
        :class="examActive ? 'icon-active' : 'icon-inactive'"
      />
    </td>
    <td class="col-title">
      <strong>{{ examTitle }}</strong>
        <span v-if="examActive">{{ $tr('active') }}</span>
        <span v-else>{{ $tr('inactive') }}</span>
        {{ ` - ${$tr('createdOn')} ${examDate}` }}
    </td>

    <td class="col-visibility"><strong>{{ visibilityString }}</strong> |
      <ui-button
        type="secondary"
        color="default"
        @click="emitChangeExamVisibility">
        {{ $tr('change') }}
      </ui-button>
    </td>

    <td class="col-action">
      <ui-button
        v-if="examActive"
        type="secondary"
        color="red"
        @click="emitDeactivateExam">
        {{ $tr('deactivate') }}
      </ui-button>

      <ui-button
        v-else
        type="secondary"
        color="primary"
        @click="emitActivateExam">
        {{ $tr('activate') }}
      </ui-button>

      <ui-icon-button
        type="secondary"
        color="primary"
        :has-dropdown="true"
        ref="dropdown"
        icon="arrow_drop_down">
        <ui-menu
          slot="dropdown"
          :options="actionOptions"
          @select="handleSelection"
          @close="$refs.dropdown.closeDropdown();"
        />
      </ui-icon-button>
    </td>
  </tr>

</template>


<script>

  const ExamActions = require('../../state/actions/exam');

  module.exports = {
    $trNameSpace: 'examRow',
    $trs: {
      active: 'Active',
      inactive: 'Inactive',
      createdOn: 'Created on',
      change: 'Change',
      activate: 'Activate',
      deactivate: 'Deactivate',
      previewExam: 'Preview exam',
      viewReport: 'View report',
      rename: 'Rename',
      delete: 'Delete',
      entireClass: 'Entire class',
      groups: '{count, number, integer} {count, plural, one {Group} other {Groups}}',
    },
    data() {
      return {
        actionOptions: [
          { label: this.$tr('previewExam') },
          { label: this.$tr('viewReport') },
          { label: this.$tr('rename') },
          { label: this.$tr('delete') },
        ],
      };
    },
    components: {
      'ui-button': require('keen-ui/src/UiButton'),
      'ui-icon': require('keen-ui/src/UiIcon'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'ui-menu': require('keen-ui/src/UiMenu'),
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
      examActive: {
        type: Boolean,
        required: true,
      },
      examDate: {
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
    computed: {
      visibilityString() {
        if (this.examVisibility.class === true) {
          return this.$tr('entireClass');
        } else if (this.examVisibility.groups.length) {
          return this.$tr('groups', { count: this.examVisibility.groups.length });
        }
        return 'Something is not right';
      },

    },
    methods: {
      emitChangeExamVisibility() {
        console.log('emitChangeExamVisibility');
      },
      emitActivateExam() {
        this.$emit('activateExam', this.examId, this.examTitle, this.examVisibility);
      },
      emitDeactivateExam() {
        console.log('deactivateExam');
      },
      emitPreviewExam() {
        console.log('emitPreviewExam');
      },
      emitViewReport() {
        console.log('emitViewReport');
      },
      emitRenameExam() {
        console.log('emitRenameExam');
      },
      emitDeleteExam() {
        console.log('emitDeleteExam');
      },
      handleSelection(optionSelected) {
        const action = optionSelected.label;
        if (action === this.$tr('previewExam')) {
          this.emitPreviewExam();
        } else if (action === this.$tr('viewReport')) {
          this.emitViewReport();
        } else if (action === this.$tr('rename')) {
          this.emitRenameExam();
        } else if (action === this.$tr('delete')) {
          this.emitDeleteExam();
        }
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
      },
      actions: {
        displayModal: ExamActions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .icon-active
    color: #4caf50

  .icon-inactive
    color: #9e9e9e

</style>
