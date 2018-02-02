<template>

  <tr>
    <td class="col-icon">
      <ui-icon
        icon="assignment"
        :ariaLabel="String(examActive)"
        :class="[examActive ? 'icon-active' : 'icon-inactive', { 'rtl-icon': isRtl }]"
      />
      <span v-if="examActive" class="active-circle"></span>
    </td>

    <td class="col-title"><strong>{{ examTitle }}</strong></td>

    <td class="col-visibility">{{ visibilityString }}</td>

    <td class="col-action">
      <dropdown-menu
        :name="$tr('options')"
        :options="actionOptions"
        @select="handleSelection"
      />
    </td>
  </tr>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import uiIcon from 'keen-ui/src/UiIcon';
  import dropdownMenu from 'kolibri.coreVue.components.dropdownMenu';

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
      dropdownMenu,
      kButton,
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
      visibilityString() {
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .col-icon
    width: 40px

  .icon-active
    color: $core-action-normal

  .icon-inactive
    color: $core-text-annotation

  .col-visibility, .col-action
    text-align: left

  .active-circle
    display: inline-block
    margin-left: -5px
    vertical-align: bottom
    height: 10px
    width: 10px
    border-radius: 50%
    background-color: $core-status-correct

</style>
