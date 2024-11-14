import { mapState, mapGetters } from 'vuex';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import CoreTable from 'kolibri/components/CoreTable';
import { ContentNodeKinds, CollectionKinds } from 'kolibri/constants';
import router from 'kolibri/router';
import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
import TimeDuration from 'kolibri-common/components/TimeDuration';
import meanBy from 'lodash/meanBy';
import maxBy from 'lodash/maxBy';
import map from 'lodash/map';
import ElapsedTime from 'kolibri-common/components/ElapsedTime';
import MasteryModel from 'kolibri-common/components/labels/MasteryModel';
import filter from 'lodash/filter';
import get from 'lodash/get';
import orderBy from 'lodash/orderBy';
import useUser from 'kolibri/composables/useUser';
import { PageNames } from '../constants';
import { LastPages } from '../constants/lastPagesConstants';
import { STATUSES } from '../modules/classSummary/constants';
import { coachStringsMixin } from './common/commonCoachStrings';
import AverageScoreTooltip from './common/AverageScoreTooltip';
import BackLink from './common/BackLink';
import TruncatedItemList from './common/TruncatedItemList';
import LessonActive from './common/LessonActive';
import LessonStatus from './common/LessonStatus';
import Recipients from './common/Recipients';
import Score from './common/Score';
import QuizActive from './common/QuizActive';
import QuizLessonDetailsHeader from './common/QuizLessonDetailsHeader';
import QuizStatus from './common/QuizStatus';
import HeaderTable from './common/HeaderTable';
import HeaderTableRow from './common/HeaderTable/HeaderTableRow';
import HeaderTabs from './common/HeaderTabs';
import HeaderTab from './common/HeaderTabs/HeaderTab';
import StatusSummary from './common/status/StatusSummary';
import StatusSimple from './common/status/StatusSimple';
import HelpNeeded from './common/status/HelpNeeded';
import Placeholder from './common/Placeholder';
import StatusElapsedTime from './common/StatusElapsedTime';
import { VERBS, ICONS } from './common/status/constants';

export default {
  components: {
    CoreTable,
    ContentIcon,
    AverageScoreTooltip,
    BackLink,
    TruncatedItemList,
    LessonActive,
    LessonStatus,
    MasteryModel,
    Recipients,
    Score,
    QuizActive,
    QuizLessonDetailsHeader,
    QuizStatus,
    HeaderTable,
    ElapsedTime,
    HeaderTableRow,
    HeaderTabs,
    HeaderTab,
    StatusSummary,
    StatusSimple,
    HelpNeeded,
    Placeholder,
    StatusElapsedTime,
    TimeDuration,
  },
  mixins: [coachStringsMixin],
  setup() {
    const { isAdmin, isCoach, isSuperuser } = useUser();
    return {
      isAdmin,
      isCoach,
      isSuperuser,
    };
  },
  computed: {
    ...mapState('classSummary', { classId: 'id', className: 'name' }),
    ...mapState('classSummary', [
      'adHocGroupsMap',
      'coachMap',
      'learnerMap',
      'groupMap',
      'examMap',
      'examLearnerStatusMap',
      'contentMap',
      'contentNodeMap',
      'contentLearnerStatusMap',
      'lessonMap',
    ]),
    ...mapGetters('classSummary', [
      'coaches',
      'learners',
      'groups',
      'exams',
      'examStatuses',
      'content',
      'contentStatuses',
      'adHocGroups',
      'lessons',
      'lessonStatuses',
      'lessonLearnerStatusMap',
      'notificationModuleData',
      'getGroupNames',
      'getGroupNamesForLearner',
      'getLearnersForGroups',
      'getLearnersForExam',
      'getLearnersForLesson',
      'getRecipientNamesForExam',
      'getRecipientNamesForLesson',
      'getContentStatusObjForLearner',
      'getContentStatusTally',
      'getExamStatusObjForLearner',
      'getExamStatusTally',
      'getLessonStatusStringForLearner',
      'getLessonStatusTally',
      'getContentAvgTimeSpent',
      'getExamAvgScore',
    ]),
    userIsAuthorized() {
      return this.$store.getters.userIsAuthorizedForCoach;
    },
    PageNames() {
      return PageNames;
    },
    ContentNodeKinds() {
      return ContentNodeKinds;
    },
    CollectionKinds() {
      return CollectionKinds;
    },
    VERBS() {
      return VERBS;
    },
    ICONS() {
      return ICONS;
    },
    STATUSES() {
      return STATUSES;
    },
    _() {
      return {
        maxBy,
        meanBy,
        orderBy,
        map,
        filter,
      };
    },
    // Generic data to be used for adding backlink data to a URL
    defaultBackLinkQuery() {
      return {
        last: this.$route.name,
        ...this.$route.params,
      };
    },
  },
  methods: {
    // This is a safer way to get the content kind to quickly patch #6552
    contentIdIsForExercise(contentId) {
      return get(this.contentMap, [contentId, 'kind']) === 'exercise';
    },
    classRoute(name, params = {}, query = {}) {
      if (this.classId) {
        params.classId = this.classId;
      }
      return router.getRoute(name, params, query);
    },
    // Set the backLinkQuery to set the correct exit behavior
    // for LessonExerciseLearnerPage and QUIZ_LEARNER_PAGE_ROOT.
    backRouteForQuery(query) {
      const lastPage = query.last;

      switch (lastPage) {
        case LastPages.HOME_PAGE:
          return this.classRoute('HomePage', {});
        case LastPages.HOME_ACTIVITY:
          return this.classRoute('HomeActivityPage', {});
        case LastPages.LEARNER_ACTIVITY:
          return this.classRoute('ReportsLearnerActivityPage', {
            learnerId: this.$route.query.last_id,
          });
        case LastPages.EXERCISE_LEARNER_LIST:
          return this.classRoute(PageNames.LESSON_EXERCISE_LEARNERS_REPORT, {
            exerciseId: this.$route.query.exerciseId,
          });
        case LastPages.EXERCISE_LEARNER_LIST_BY_GROUPS:
          return this.classRoute(
            PageNames.LESSON_EXERCISE_LEARNERS_REPORT,
            {
              exerciseId: this.$route.query.exerciseId,
            },
            {
              groups: 'true',
            },
          );
        case LastPages.EXERCISE_QUESTION_LIST:
          return this.classRoute(PageNames.LESSON_EXERCISE_QUESTIONS_REPORT, {
            exerciseId: this.$route.query.exerciseId,
          });
        case LastPages.RESOURCE_LEARNER_LIST:
          return this.classRoute(PageNames.LESSON_RESOURCE_LEARNERS_REPORT, {
            resourceId: this.$route.query.resourceId,
          });
        case LastPages.RESOURCE_LEARNER_LIST_BY_GROUPS:
          return this.classRoute(
            PageNames.LESSON_RESOURCE_LEARNERS_REPORT,
            {
              resourceId: this.$route.query.resourceId,
            },
            {
              groups: 'true',
            },
          );
        default:
          if (lastPage) {
            return this.classRoute(lastPage, query);
          }
          return null;
      }
    },
    /**
     * @param {Object[]} statuses
     * @param {Date|null} statuses[].last_activity
     * @return {Date|null}
     */
    maxLastActivity(statuses) {
      const max = this._.maxBy(statuses, 'last_activity');
      return max && max.last_activity ? max.last_activity : null;
    },
    missingResourceObj(dummyId) {
      return {
        node_id: dummyId,
        kind: 'warning',
        title: coreStrings.$tr('resourceNotFoundOnDevice'),
        missing: true,
      };
    },
  },
};
