<template>

  <div
    v-show="!$isPrint"
    class="report-controls"
  >
    <slot></slot>
    <div class="report-controls-buttons">
      <KRouterLink
        v-if="isMainReport"
        :text="$tr('viewLearners')"
        appearance="basic-link"
        :to="classLearnersListRoute"
      />
      <KIconButton
        ref="printButton"
        icon="print"
        :aria-label="coachString('printReportAction')"
        @click.prevent="$print()"
      />
      <KTooltip
        reference="printButton"
        :refs="$refs"
      >
        {{ coachString('printReportAction') }}
      </KTooltip>

      <KIconButton
        v-if="!exportDisabled"
        ref="exportButton"
        icon="download"
        :aria-label="coachString('exportCSVAction')"
        @click.prevent="$emit('export')"
      />
      <KTooltip
        reference="exportButton"
        :refs="$refs"
      >
        {{ coachString('exportCSVAction') }}
      </KTooltip>
    </div>
  </div>

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import commonCoach from '../common';
  import { ClassesPageNames } from '../../../../../learn/assets/src/constants';
  import { LastPages } from '../../constants/lastPagesConstants';

  export default {
    name: 'ReportsControls',
    mixins: [commonCoach],
    setup() {
      const { isAppContext } = useUser();

      return {
        isAppContext,
      };
    },
    props: {
      disableExport: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      exportDisabled() {
        // Always disable in app mode until we add the ability to download files.
        return this.isAppContext || this.disableExport;
      },
      isMainReport() {
        return (
          this.$route.name === 'ReportsQuizListPage' ||
          this.$route.name === 'ReportsGroupListPage' ||
          this.$route.name === 'ReportsLearnerListPage' ||
          this.$route.name === 'ReportsLessonListPage' ||
          this.$route.name === 'EXAMS'
        );
      },
      classLearnersListRoute() {
        const { query } = this.$route;
        const route = {
          name: ClassesPageNames.CLASS_LEARNERS_LIST_VIEWER,
          params: {
            id: this.classId,
          },
          query: {
            ...query,
            ...pickBy({
              last: LastPages.RESOURCE_LEARNER_LIST_BY_GROUPS,
            }),
          },
        };
        return route;
      },
    },
    $trs: {
      viewLearners: {
        message: 'View learner devices',
        context:
          "Option in the Reports > Quizzes section which allows coach to view a list of the learners' devices.\n\nLearner devices are ones that have Kolibri features for learners, but not those for coaches and admins.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .report-controls {
    position: relative;
    min-height: 40px;
    padding-right: 80px;
  }

  .report-controls-buttons {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
  }

  .learner-device-link {
    margin-right: 10px;
    font-size: 14px;
  }

</style>
