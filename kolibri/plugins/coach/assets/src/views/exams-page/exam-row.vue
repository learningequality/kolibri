<template>

  <tr>
    <td class="core-table-icon-col">
      <ui-icon
        icon="assignment_late"
        :ariaLabel="String(examActive)"
      />
    </td>

    <td class="core-table-main-col">
      <k-router-link
        :text="examTitle"
        :to="examRoute"
      />
    </td>

    <td>{{ recipients }}</td>

    <td>
      <status-icon :active="examActive" />
      <k-dropdown-menu
        :text="$tr('options')"
        :options="actionOptions"
        appearance="flat-button"
        @select="handleSelection"
      />
    </td>
  </tr>

</template>


<script>

  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import uiIcon from 'keen-ui/src/UiIcon';
  import kDropdownMenu from 'kolibri.coreVue.components.kDropdownMenu';
  import StatusIcon from '../StatusIcon';
  import { PageNames } from '../../constants';

  export default {
    name: 'examRow',
    $trs: {
      change: 'Change',
      activate: 'Activate',
      deactivate: 'Deactivate',
      previewExam: 'Preview exam',
      changeVisibility: 'Change visibility',
      viewReport: 'View report',
      rename: 'Rename',
      delete: 'Delete',
      entireClass: 'Entire class',
      groups: '{count, number, integer} {count, plural, one {Group} other {Groups}}',
      nobody: 'Nobody',
      options: 'Options',
    },
    components: {
      uiIcon,
      kDropdownMenu,
      kRouterLink,
      StatusIcon,
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
      examVisibility: {
        type: Object,
        required: true,
      },
    },
    computed: {
      recipients() {
        if (this.examVisibility.class) {
          return this.$tr('entireClass');
        } else if (this.examVisibility.groups.length) {
          return this.$tr('groups', { count: this.examVisibility.groups.length });
        }
        return this.$tr('nobody');
      },
      actionOptions() {
        return [
          { label: this.examActive ? this.$tr('deactivate') : this.$tr('activate') },
          { label: this.$tr('previewExam') },
          { label: this.$tr('changeVisibility') },
          { label: this.$tr('viewReport') },
          { label: this.$tr('rename') },
          { label: this.$tr('delete') },
        ];
      },
      examRoute() {
        return {
          name: PageNames.EXAM_REPORT,
          params: { examId: this.examId },
        };
      },
    },
    methods: {
      emitActivateExam() {
        this.$emit('activateExam', this.examId);
      },
      emitDeactivateExam() {
        this.$emit('deactivateExam', this.examId);
      },
      emitPreviewExam() {
        this.$emit('previewExam', this.examId);
      },
      emitChangeExamVisibility() {
        this.$emit('changeExamVisibility', this.examId);
      },
      emitViewReport() {
        this.$emit('viewReport');
      },
      emitRenameExam() {
        this.$emit('renameExam', this.examId);
      },
      emitDeleteExam() {
        this.$emit('deleteExam', this.examId);
      },
      handleSelection(optionSelected) {
        const action = optionSelected.label;
        if (action === this.$tr('activate')) {
          this.emitActivateExam();
        } else if (action === this.$tr('deactivate')) {
          this.emitDeactivateExam();
        } else if (action === this.$tr('previewExam')) {
          this.emitPreviewExam();
        } else if (action === this.$tr('changeVisibility')) {
          this.emitChangeExamVisibility();
        } else if (action === this.$tr('viewReport')) {
          this.emitViewReport();
        } else if (action === this.$tr('rename')) {
          this.emitRenameExam();
        } else if (action === this.$tr('delete')) {
          this.emitDeleteExam();
        }
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
