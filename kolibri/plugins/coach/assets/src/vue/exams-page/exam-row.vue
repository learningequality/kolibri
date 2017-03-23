<template>

  <tr>
    <td class="col-icon">
      <ui-icon
        icon="assignment"
        :ariaLabel="String(active)"
        :class="active ? 'icon-active' : 'icon-inactive'"
      />
    </td>
    <td class="col-title">
      <strong>{{ title }}</strong>
        <span v-if="active">{{ $tr('active') }}</span>
        <span v-else>{{ $tr('inactive') }}</span>
        {{ ` - ${$tr('createdOn')} ${dateCreated}` }}
    </td>

    <td class="col-visibility">{{ visibleToString(visibleTo) }} |
      <ui-button
        type="secondary"
        color="default"
        @click="openChangeExamVisibilityModal">
        {{ $tr('change') }}
      </ui-button>
    </td>

    <td class="col-action">
      <ui-button
        v-if="active"
        type="secondary"
        color="red"
        @click="openDeactivateExamModal">
        {{ $tr('deactivate') }}
      </ui-button>
      <ui-button
        v-else
        type="secondary"
        color="primary"
        @click="openActivateExamModal">
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
      active: {
        type: Boolean,
        required: true,
      },
      dateCreated: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      visibleTo: {
        required: true,
      },
      className: {
        type: String,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
      classGroups: {
        type: Array,
        required: true,
      },
    },
    methods: {
      visibleToString(groups) {
        return 'TODO';
      },
      openChangeExamVisibilityModal() {
        console.log('openChangeExamVisibilityModal');
      },
      openActivateExamModal() {
        console.log('openActivateExamModal');
      },
      openDeactivateExamModal() {
        console.log('openDeactivateExamModal');
      },
      handleSelection(optionSelected) {
        const action = optionSelected.label;
        if (action === this.$tr('previewExam')) {
          this.openExamPreviewModal();
        } else if (action === this.$tr('viewReport')) {
          this.openExamReportModal();
        } else if (action === this.$tr('rename')) {
          this.openRenameExamModal();
        } else if (action === this.$tr('delete')) {
          this.openDeleteExamModal();
        }
      },
      openExamPreviewModal() {
        console.log('openExamPreviewModal');
      },
      openExamReportModal() {
        console.log('openExamReportModal');
      },
      openRenameExamModal() {
        console.log('openRenameExamModal');
      },
      openDeleteExamModal() {
        console.log('openDeleteExamModal');
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
