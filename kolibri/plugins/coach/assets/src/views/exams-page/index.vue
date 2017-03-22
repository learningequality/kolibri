<template>

  <div>
    <h1>{{ currentClass.name }} {{ $tr('exams') }}</h1>
    <ui-radio-group
      :name="$tr('examFilter')"
      :label="$tr('show')"
      v-model="filterSelected"
      :options="filterOptions"
    />
    <ui-button
      type="primary"
      color="primary"
      :raised="true"
      icon="add"
      @click="openCreateExamModal">
      {{ $tr('newExam') }}
    </ui-button>
    <table v-if="exams.length">
      <thead>
        <tr>
          <th class="col-icon"></th>
          <th class="col-title">{{ $tr('title') }}</th>
          <th class="col-visibility">{{ $tr('visibleTo') }}</th>
          <th class="col-action">{{ $tr('action') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="exam in filteredExams">
          <td class="col-icon">
            <ui-icon
              icon="assignment"
              :ariaLabel="String(exam.active)"
              :class="exam.active ? 'icon-active' : 'icon-inactive'"
            />
          </td>
          <td class="col-title">
            <strong>{{ exam.title }}</strong>
              <span v-if="exam.active">{{ $tr('active') }}</span>
              <span v-else>{{ $tr('inactive') }}</span>
              {{ ` - ${$tr('createdOn')} ${exam.dateCreated}` }}
          </td>

          <td class="col-visibility">{{ visibleToString(exam.visibleTo) }} |
            <ui-button
              type="secondary"
              color="default"
              @click="openChangeExamVisibilityModal">
              {{ $tr('change') }}
            </ui-button>
          </td>

          <td class="col-action">
            <ui-button
              v-if="exam.active"
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
                @close="close"
              />
            </ui-icon-button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="center-text"><strong>{{ $tr('noExams') }}</strong></p>
  </div>

</template>


<script>

  module.exports = {
    $trNameSpace: 'coachExamsPage',
    $trs: {
      exams: 'Exams',
      show: 'Show',
      examFilter: 'Exam filter',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      newExam: 'New Exam',
      title: 'Title',
      visibleTo: 'Visible to',
      action: 'Action',
      createdOn: 'Created on',
      change: 'Change',
      previewExam: 'Preview exam',
      viewReport: 'View report',
      rename: 'Rename',
      delete: 'Delete',
      activate: 'Activate',
      deactivate: 'Deactivate',
      noExams: `You do not have any exams. Start by creating a new exam above.`,

    },
    components: {
      'ui-icon': require('keen-ui/src/UiIcon'),
      'ui-button': require('keen-ui/src/UiButton'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'ui-menu': require('keen-ui/src/UiMenu'),
      'ui-radio-group': require('keen-ui/src/UiRadioGroup'),
    },
    data() {
      return {
        filterSelected: this.$tr('all'),
        filterOptions: [
          { label: this.$tr('all'), value: this.$tr('all') },
          { label: this.$tr('active'), value: this.$tr('active') },
          { label: this.$tr('inactive'), value: this.$tr('inactive') }
        ],
        actionOptions: [
          { label: this.$tr('previewExam') },
          { label: this.$tr('viewReport') },
          { label: this.$tr('rename') },
          { label: this.$tr('delete') },
        ],
      };
    },
    computed: {
      activeExams() {
        return this.exams.filter(exam => exam.active === true);
      },
      inactiveExams() {
        return this.exams.filter(exam => exam.active === false);
      },
      filteredExams() {
        const filter = this.filterSelected;
        if (filter === this.$tr('active')) {
          return this.activeExams;
        } else if (filter === this.$tr('inactive')) {
          return this.inactiveExams;
        }
        return this.exams;
      }
    },
    methods: {
      visibleToString(groups) {
        return 'TODO';
      },
      openCreateExamModal() {
        console.log('openCreateExamModal');
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
      close() {
        console.log('close');
      },
    },
    vuex: {
      getters: {
        currentClass: state => state.pageState.currentClass,
        classes: state => state.pageState.classes,
        currentChannel: state => state.pageState.currentChannel,
        channels: state => state.pageState.channels,
        exams: state => state.pageState.exams,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .icon-active
    color: #4caf50

  .icon-inactive
    color: #9e9e9e

  .center-text
    text-align: center

</style>
