<template>

  <tr>
    <td class="col-icon">
      <ui-icon
        icon="assignment"
        :ariaLabel="String(examActive)"
        :class="examActive ? 'icon-active' : 'icon-inactive'"
      />
      <span v-if="examActive" class="active-circle"></span>
    </td>

    <td class="col-title"><strong>{{ examTitle }}</strong></td>

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

  import uiButton from 'keen-ui/src/UiButton';
  import uiIcon from 'keen-ui/src/UiIcon';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import uiMenu from 'keen-ui/src/UiMenu';
  export default {
    $trNameSpace: 'examRow',
    $trs: {
      change: 'Change',
      activate: 'Activate',
      deactivate: 'Deactivate',
      previewExam: 'Preview exam',
      viewReport: 'View report',
      rename: 'Rename',
      delete: 'Delete',
      entireClass: 'Entire class',
      groups: '{count, number, integer} {count, plural, one {Group} other {Groups}}',
      nobody: 'Nobody'
    },
    components: {
      uiButton,
      uiIcon,
      uiIconButton,
      uiMenu
    },
    props: {
      examId: {
        type: String,
        required: true
      },
      examTitle: {
        type: String,
        required: true
      },
      examActive: {
        type: Boolean,
        required: true
      },
      examVisibility: {
        type: Object,
        required: true
      }
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
          { label: this.$tr('previewExam') },
          { label: this.$tr('viewReport') },
          { label: this.$tr('rename') },
          { label: this.$tr('delete') }
        ];
      }
    },
    methods: {
      emitChangeExamVisibility() {
        this.$emit('changeExamVisibility', this.examId);
      },
      emitActivateExam() {
        this.$emit('activateExam', this.examId);
      },
      emitDeactivateExam() {
        this.$emit('deactivateExam', this.examId);
      },
      emitPreviewExam() {
        this.$emit('previewExam', this.examId);
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
        if (action === this.$tr('previewExam')) {
          this.emitPreviewExam();
        } else if (action === this.$tr('viewReport')) {
          this.emitViewReport();
        } else if (action === this.$tr('rename')) {
          this.emitRenameExam();
        } else if (action === this.$tr('delete')) {
          this.emitDeleteExam();
        }
      }
    }
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .icon-active
    color: $core-action-normal

  .icon-inactive
    color: $core-text-annotation

  .col-visibility, .col-action
    text-align: right

  .active-circle
    display: inline-block
    margin-left: -5px
    vertical-align: bottom
    height: 10px
    width: 10px
    border-radius: 50%
    background-color: $core-status-correct

</style>
