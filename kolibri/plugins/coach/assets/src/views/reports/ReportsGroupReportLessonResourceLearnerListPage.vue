<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <p>
        <BackLink
          :to="classRoute('ReportsGroupReportLessonPage', {})"
          :text="$tr('back', { lesson: 'Lesson 1' })"
        />
      </p>
      <h1>Some Video</h1>

      <KButton :text="coachStrings.$tr('previewAction')" />

      <HeaderTable>
        <HeaderTableRow>
          <template slot="key">{{ coachStrings.$tr('avgTimeSpentLabel') }}</template>
          <template slot="value"><TimeDuration :seconds="360" /></template>
        </HeaderTableRow>
        <HeaderTableRow>
          <template slot="key">{{ $tr('avgNumViews') }}</template>
          <template slot="value">{{ coachStrings.$tr('integer', {value: 3}) }}</template>
        </HeaderTableRow>
      </HeaderTable>

      <p>
        <LearnerProgressCount
          :count="5"
          verbosity="0"
          verb="completed"
          icon="star"
        />
        <LearnerProgressCount
          :count="5"
          verbosity="0"
          verb="started"
          icon="clock"
        />
        <LearnerProgressCount
          :count="5"
          verbosity="0"
          verb="notStarted"
          icon="nothing"
        />
      </p>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('nameLabel') }}</td>
            <td>{{ coachStrings.$tr('statusLabel') }}</td>
            <td>{{ coachStrings.$tr('viewsLabel') }}</td>
            <td>{{ coachStrings.$tr('timeSpentLabel') }}</td>
            <td>{{ coachStrings.$tr('lastActivityLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr>
            <td>April</td>
            <td>
              <LearnerProgressLabel
                :count="1"
                :verbosity="1"
                verb="notStarted"
                icon="nothing"
              />
            </td>
            <td>23</td>
            <td><TimeDuration :seconds="60*15" /></td>
            <td>some time ago</td>
          </tr>
          <tr>
            <td>John</td>
            <td>
              <LearnerProgressLabel
                :count="1"
                :verbosity="1"
                verb="completed"
                icon="star"
              />
            </td>
            <td>23</td>
            <td><TimeDuration :seconds="60*15" /></td>
            <td>some time ago</td>
          </tr>
          <tr>
            <td>Steve</td>
            <td>
              <LearnerProgressLabel
                :count="1"
                :verbosity="1"
                verb="started"
                icon="clock"
              />
            </td>
            <td>23</td>
            <td><TimeDuration :seconds="60*15" /></td>
            <td>some time ago</td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsGroupReportLessonResourceLearnerListPage',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: "Back to '{lesson}'",
      avgNumViews: 'Average number of views',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
