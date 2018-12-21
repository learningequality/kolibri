<template>

  <div class="new-coach-block">
    <p>
      <BackLink
        :to="{ name:'NEW_COACH_PAGES', params: {page: 'ReportsLessonList'} }"
        :text="$tr('back')"
      />
    </p>
    <h1>Some Lesson</h1>
    <KDropdownMenu
      slot="optionsDropdown"
      :text="$tr('options')"
      :options="actionOptions"
      appearance="raised-button"
      @select="goTo($event.value)"
    />
    <dl>
      <dt>{{ $tr('status') }}</dt>
      <dd><LessonActive :active="true" /></dd>
      <dt>{{ $tr('recipients') }}</dt>
      <dd>Group 1, Group 2</dd>
      <dt>{{ $tr('descriptionn') }}</dt>
      <dd>Ipsum lorem</dd>
    </dl>

    <h2>{{ $tr('numResources', {count: 4}) }}</h2>
    <table class="new-coach-table">
      <thead>
        <tr>
          <td>{{ $tr('tableHeaderTitle') }}</td>
          <td>{{ $tr('tableHeaderProgress') }}</td>
          <td>{{ $tr('tableHeaderTime') }}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <KRouterLink
              text="Some exercise"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsExerciseClassReportUsers' }}"
            />
          </td>
          <td><Completed :count="3" :total="6" /></td>
          <td><TimeDuration :seconds="360" /></td>
        </tr>
        <tr>
          <td>
            <KRouterLink
              text="Some video"
              :to="{name: 'NEW_COACH_PAGES', params: { page: 'ReportsResourceClassReport' }}"
            />
          </td>
          <td>
            <Completed :count="3" :total="6" /> &nbsp; <NeedHelp :count="1" />
          </td>
          <td><TimeDuration :seconds="120" /></td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import LessonActive from '../LessonActive';
  import TimeDuration from '../TimeDuration';
  import Completed from '../Status/Completed';
  import NeedHelp from '../Status/NeedHelp';
  import BackLink from '../BackLink';

  export default {
    name: 'ReportsLesson',
    components: {
      LessonActive,
      TimeDuration,
      Completed,
      NeedHelp,
      BackLink,
      KRouterLink,
      KDropdownMenu,
    },
    computed: {
      actionOptions() {
        return [
          { label: this.$tr('editDetails'), value: 'ReportsLessonDetailEditor' },
          { label: this.$tr('manageResources'), value: 'ReportsLessonResourceManager' },
        ];
      },
    },
    methods: {
      goTo(page) {
        this.$router.push({ name: 'NEW_COACH_PAGES', params: { page } });
      },
    },
    $trs: {
      numResources: '{count, number, integer} {count, plural, one {resource} other {resources}}',
      options: 'Options',
      editDetails: 'Edit Details',
      manageResources: 'Manage Resources',
      back: 'View all lessons',
      status: 'Status',
      recipients: 'Recipients',
      descriptionn: 'Description',
      optionsEdit: 'Edit details',
      optionsManage: 'Manage resources',
      tableHeaderTitle: 'Title',
      tableHeaderProgress: 'Progress',
      tableHeaderTime: 'Average time spent',
    },
  };

</script>


<style lang="scss" scoped></style>
