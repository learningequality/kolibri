<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <p>
        <BackLink
          :to="newCoachRoute('ReportsLessonReportPage')"
          :text="$tr('back', { lesson: lessonName })"
        />
      </p>
      <h1>Some Video</h1>
      <KButton :text="coachStrings.$tr('previewAction')" />
      <KCheckbox :label="coachStrings.$tr('viewByGroupsLabel')" />
      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>

      <dl>
        <dt>{{ coachStrings.$tr('avgTimeSpentLabel') }}</dt>
        <dd><TimeDuration :seconds="360" /></dd>
        <dt>{{ $tr('avgNumViews') }}</dt>
        <dd>{{ coachStrings.$tr('integer', {value: 3}) }}</dd>
      </dl>

      <p>
        <LearnerProgressCount
          :verbosity="0"
          :count="1"
          verb="completed"
          icon="star"
        />
        <LearnerProgressCount
          :verbosity="0"
          :count="1"
          verb="started"
          icon="clock"
        />
        <LearnerProgressCount
          :verbosity="0"
          :count="1"
          verb="notStarted"
          icon="nothing"
        />
      </p>
      <table class="new-coach-table">
        <thead>
          <tr>
            <td>{{ coachStrings.$tr('nameLabel') }}</td>
            <td>{{ coachStrings.$tr('statusLabel') }}</td>
            <td>{{ coachStrings.$tr('viewsLabel') }}</td>
            <td>{{ coachStrings.$tr('timeSpentLabel') }}</td>
            <td>{{ coachStrings.$tr('groupsLabel') }}</td>
            <td>{{ coachStrings.$tr('lastActivityLabel') }}</td>
          </tr>
        </thead>
        <tbody>
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
            <td>Gnomes | Explorers</td>
            <td>some time ago</td>
          </tr>
          <tr>
            <td>Tom</td>
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
            <td>Gnomes | Explorers</td>
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
            <td>Gnomes | Explorers</td>
            <td>some time ago</td>
          </tr>
        </tbody>
      </table>
    </div>
  </CoreBase>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsLessonResourceLearnerListPage',
    components: {},
    mixins: [imports],
    data() {
      return {
        lessonName: 'Lesson A',
      };
    },
    $trs: {
      back: "Back to '{lesson}'",
      avgNumViews: 'Average number of views',
    },
  };

</script>


<style lang="scss" scoped></style>
