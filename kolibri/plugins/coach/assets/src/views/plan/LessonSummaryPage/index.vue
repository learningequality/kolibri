<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />
    <KGrid v-if="!loading">
      <KGridItem>
        <QuizLessonDetailsHeader
          examOrLesson="lesson"
          :backlinkLabel="coreString('allLessonsLabel')"
          :backlink="$router.getRoute('PLAN_LESSONS_ROOT', { classId: classId })"
        >
          <LessonOptionsDropdownMenu
            slot="dropdown"
            optionsFor="plan"
            @select="handleSelectOption"
          />
        </QuizLessonDetailsHeader>
      </KGridItem>
      <KGridItem :layout12="{ span: 4 }">
        <LessonStatus
          :className="className"
          :lesson="currentLesson"
          :groupNames="getRecipientNamesForLesson(currentLesson)"
          activeKey="is_active"
        />
      </KGridItem>
      <KGridItem :layout12="{ span: 8 }">
        <KPageContainer>
          <div class="lesson-summary">
            <div>
              <div class="resource-list">
                <div class="resource-list-header">
                  <div class="resource-list-header-title-block">
                    <h2 class="resource-list-header-title">
                      {{ coreString('resourcesLabel') }}
                    </h2>
                  </div>
                  <div class="resource-list-header-add-resource-button">
                    <KRouterLink
                      :to="lessonSelectionRootPage"
                      :text="coachString('manageResourcesAction')"
                      :primary="true"
                      appearance="raised-button"
                    />
                  </div>
                </div>
              </div>

              <ResourceListTable v-if="workingResources.length" />

              <p v-else class="no-resources-message">
                {{ coachString('noResourcesInLessonLabel') }}
              </p>

              <ManageLessonModals
                :currentAction="currentAction"
                @cancel="currentAction = ''"
              />
            </div>

          </div>

        </KPageContainer>
      </KGridItem>
    </KGrid>

  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import { selectionRootLink } from '../../../routes/planLessonsRouterUtils';
  import ManageLessonModals from './ManageLessonModals';
  import ResourceListTable from './ResourceListTable';
  import LessonOptionsDropdownMenu from './LessonOptionsDropdownMenu';

  export default {
    name: 'LessonSummaryPage',
    metaInfo() {
      return {
        title: this.currentLesson.title,
      };
    },
    components: {
      ResourceListTable,
      ManageLessonModals,
      LessonOptionsDropdownMenu,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        currentAction: '',
      };
    },
    computed: {
      ...mapState('classSummary', { classId: 'id' }),
      ...mapState('lessonSummary', ['currentLesson', 'workingResources']),
      loading() {
        return this.$store.state.core.loading;
      },
      lessonId() {
        return this.$route.params.lessonId;
      },
      lessonSelectionRootPage() {
        return selectionRootLink({ lessonId: this.lessonId, classId: this.classId });
      },
    },
    methods: {
      handleSelectOption(action) {
        if (action === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('LessonEditDetailsPage'));
        } else {
          this.currentAction = action;
        }
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .resource-list-header {
    // TODO use shared class or mixin
    // maintaining a simple right/left alignment in a single text-line without floats. Simple RTL
    display: table;
    width: 100%;
  }

  .resource-list-header-title {
    display: inline-block;
    font-size: 1em;
  }

  .resource-list-header-title-block {
    display: table-cell;
    text-align: left;
  }

  .resource-list-header-add-resource-button {
    display: table-cell;
    text-align: right;
  }

  .no-resources-message {
    padding: 48px 0;
    text-align: center;
  }

</style>
