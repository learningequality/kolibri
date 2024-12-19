<template>

  <div>
    <div style="display: flex; justify-content: space-between">
      <p>
        <BackLink
          :to="classRoute(PageNames.LEARNERS_ROOT)"
          :text="$tr('back')"
        />
      </p>
      <ReportsControls :disableExport="true" />
    </div>
    <h1>
      <KLabeledIcon
        icon="person"
        :label="learner.name"
      />
    </h1>
    <KGrid>
      <KGridItem :layout12="{ span: 4 }">
        <HeaderTable>
          <HeaderTableRow>
            <template #key>
              {{ coachString('classLabel') }}
            </template>
            <template #value>
              {{ className }}
            </template>
          </HeaderTableRow>
          <HeaderTableRow>
            <template #key>
              {{ coreString('usernameLabel') }}
            </template>
            <template #value>
              {{ learner.username }}
            </template>
          </HeaderTableRow>
          <HeaderTableRow>
            <template #key>
              {{ coachString('groupsLabel') }}
            </template>
            <template #value>
              <TruncatedItemList :items="getGroupNamesForLearner(learner.id)" />
            </template>
          </HeaderTableRow>
        </HeaderTable>
      </KGridItem>
      <KGridItem :layout12="{ span: 4 }">
        <div :style="boxStyle">
          <p
            class="key"
            :style="{ color: $themeTokens.primary }"
          >
            {{ coachString('lessonsCompletedLabel') }}
          </p>
          <div class="value-box">
            <p class="value">{{ lessonsCompleted }}</p>
            <p style="display: inline; word-wrap: break-word">
              {{ $tr('totalLessons', { total: lessons.length }) }}
            </p>
          </div>
        </div>
      </KGridItem>
      <KGridItem :layout12="{ span: 4 }">
        <div :style="boxStyle">
          <p
            class="key"
            :style="{ color: $themeTokens.primary }"
          >
            {{ coachString('avgScoreLabel') }}
          </p>
          <div class="value-box">
            <p class="value">
              {{ $formatNumber(avgScore, { style: 'percent', maximumFractionDigits: 0 }) }}
            </p>
          </div>
        </div>
      </KGridItem>
      <KGridItem :layout12="{ span: 4 }" />
      <KGridItem :layout12="{ span: 4 }">
        <div :style="boxStyle">
          <p
            class="key"
            :style="{ color: $themeTokens.primary }"
          >
            {{ coachString('exercisesCompletedLabel') }}
          </p>
          <div class="value-box">
            <p class="value">{{ $formatNumber(exercisesCompleted) }}</p>
          </div>
        </div>
      </KGridItem>
      <KGridItem :layout12="{ span: 4 }">
        <div :style="boxStyle">
          <p
            class="key"
            :style="{ color: $themeTokens.primary }"
          >
            {{ coachString('resourcesViewedLabel') }}
          </p>
          <div class="value-box">
            <p class="value">{{ $formatNumber(resourcesViewed) }}</p>
          </div>
        </div>
      </KGridItem>
    </KGrid>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../../common';
  import ReportsControls from '../../common/ReportsControls';

  export default {
    name: 'LearnerHeader',
    components: {
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    computed: {
      learner() {
        return this.learnerMap[this.$route.params.learnerId];
      },
      learnerContentStatuses() {
        return this.contentStatuses.filter(status => this.learner.id === status.learner_id);
      },
      lessonsCompleted() {
        const statuses = this.lessonStatuses.filter(
          status =>
            this.learner.id === status.learner_id && status.status === this.STATUSES.completed,
        );
        if (!statuses.length) {
          return 0;
        }
        return statuses.length;
      },
      avgScore() {
        const statuses = this.examStatuses.filter(
          status =>
            this.learner.id === status.learner_id && status.status === this.STATUSES.completed,
        );
        if (!statuses.length) {
          return null;
        }
        return this._.meanBy(statuses, 'score');
      },
      exercisesCompleted() {
        const statuses = this.learnerContentStatuses.filter(
          status =>
            this.contentIdIsForExercise(status.content_id) &&
            status.status === this.STATUSES.completed,
        );
        return statuses.length;
      },
      resourcesViewed() {
        const statuses = this.learnerContentStatuses.filter(
          status =>
            !this.contentIdIsForExercise(status.content_id) &&
            status.status !== this.STATUSES.notStarted,
        );
        return statuses.length;
      },
      boxStyle() {
        return {
          border: '1px solid',
          borderColor: this.$themePalette.grey.v_200,
          borderRadius: '4px',
          padding: '0px 16px',
          margin: '5px',
        };
      },
    },
    $trs: {
      back: {
        message: 'All learners',
        context:
          "Link that takes user back to the list of learners on the 'Reports' tab, from the individual learner's information page.",
      },
      totalLessons: 'of {total}',
    },
  };

</script>


<style lang="scss" scoped>

  .key {
    font-size: 14px;
  }

  .value-box {
    padding-bottom: 10px;
  }

  p.value {
    position: relative;
    display: inline;
    margin-right: 5px;
    margin-bottom: 0;
    font-size: 32px;
    word-wrap: break-word;
  }

</style>
