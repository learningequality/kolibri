<template>

  <div>
    <h1>{{ currentClass.name }} {{ $tr('exams') }}</h1>
    <ui-radio-group
      :name="$tr('examFilter')"
      :label="$tr('examFilter')"
      v-model="filterSelected"
      :options="filterOptions"
    />
    <icon-button
      :text="$tr('newExam')"
      :primary="true"
      @click="openCreateExamModal">
      <mat-svg category="content" name="add"/>
    </icon-button>

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
        <tr v-for="exam in exams">
          <td class="col-icon">
            <ui-icon
              icon="assignment"
              :ariaLabel="String(exam.active)"
              :class="exam.active ? 'icon-active' : 'icon-inactive'"
            />
          </td>
          <td class="col-title">
            <strong>{{ exam.title }}</strong>
            <p>{{ `${exam.active} - ${$tr('createdOn')} ${exam.dateCreated}` }}</p>
            </td>
          <td class="col-visibility">{{ visibleToString(exam.visibleTo) }} |
            <icon-button
              :text="$tr('change')"
              :primary="false"
              @click="openChangeExamVisibilityModal"
            />
          </td>
          <td class="col-action">temp</td>
        </tr>
      </tbody>
    </table>
    <div v-else></div>
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
    },
    components: {
      'ui-icon': require('keen-ui/src/UiIcon'),
      'ui-radio-group': require('keen-ui/src/UiRadioGroup'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    data() {
      return {
        filterSelected: this.$tr('all'),
        filterOptions: [
          { label: this.$tr('all'), value: this.$tr('all') },
          { label: this.$tr('active'), value: this.$tr('active') },
          { label: this.$tr('inactive'), value: this.$tr('inactive') }
        ],
      };
    },
    methods: {
      visibleToString(groups) {
        return 'TODO';
      }
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
    color: green

  .icon-inactive
    color: gray

</style>
