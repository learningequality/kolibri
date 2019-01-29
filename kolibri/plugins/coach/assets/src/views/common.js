import { mapState, mapGetters } from 'vuex';
import CoreBase from 'kolibri.coreVue.components.CoreBase';
import CoreTable from 'kolibri.coreVue.components.CoreTable';
import KModal from 'kolibri.coreVue.components.KModal';
import KButton from 'kolibri.coreVue.components.KButton';
import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
import KGrid from 'kolibri.coreVue.components.KGrid';
import KGridItem from 'kolibri.coreVue.components.KGridItem';
import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
import { ContentNodeKinds, CollectionKinds } from 'kolibri.coreVue.vuex.constants';
import KSelect from 'kolibri.coreVue.components.KSelect';
import router from 'kolibri.coreVue.router';
import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
import meanBy from 'lodash/meanBy';
import maxBy from 'lodash/maxBy';
import map from 'lodash/map';
import ElapsedTime from 'kolibri.coreVue.components.ElapsedTime';
import filter from 'lodash/filter';
import sortBy from 'lodash/sortBy';
import { PageNames } from '../constants';
import { STATUSES } from '../modules/classSummary/constants';
import TopNavbar from './TopNavbar';
import { coachStringsMixin } from './common/commonCoachStrings';
import Answer from './common/Answer';
import BackLink from './common/BackLink';
import TruncatedItemList from './common/TruncatedItemList';
import LessonActive from './common/LessonActive';
import MasteryModel from './common/MasteryModel';
import Recipients from './common/Recipients';
import Score from './common/Score';
import TimeDuration from './common/TimeDuration';
import QuizActive from './common/QuizActive';
import HeaderTable from './common/HeaderTable';
import HeaderTableRow from './common/HeaderTable/HeaderTableRow';
import HeaderTabs from './common/HeaderTabs';
import HeaderTab from './common/HeaderTabs/HeaderTab';
import LearnerProgressRatio from './common/status/LearnerProgressRatio';
import LearnerProgressCount from './common/status/LearnerProgressCount';
import LearnerProgressLabel from './common/status/LearnerProgressLabel';
import ItemStatusRatio from './common/status/ItemStatusRatio';
import ItemStatusCount from './common/status/ItemStatusCount';
import ItemStatusLabel from './common/status/ItemStatusLabel';
import Placeholder from './common/Placeholder';
import { OBJECTS, ADJECTIVES, VERBS, ICONS } from './common/status/constants';

export default {
  name: 'ReportsQuizHeader',
  components: {
    CoreBase,
    CoreTable,
    ContentIcon,
    TopNavbar,
    KModal,
    KButton,
    KCheckbox,
    KDropdownMenu,
    KGrid,
    KGridItem,
    KRouterLink,
    KSelect,
    Answer,
    BackLink,
    TruncatedItemList,
    LessonActive,
    MasteryModel,
    Recipients,
    Score,
    TimeDuration,
    QuizActive,
    HeaderTable,
    ElapsedTime,
    HeaderTableRow,
    HeaderTabs,
    HeaderTab,
    LearnerProgressRatio,
    LearnerProgressCount,
    LearnerProgressLabel,
    ItemStatusRatio,
    ItemStatusCount,
    ItemStatusLabel,
    Placeholder,
  },
  mixins: [coachStringsMixin],
  computed: {
    ...mapGetters(['isAdmin', 'isCoach', 'isSuperuser']),
    ...mapState('classSummary', { classId: 'id', className: 'name' }),
    userIsAuthorized() {
      return this.isCoach || this.isAdmin || this.isSuperuser;
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
    OBJECTS() {
      return OBJECTS;
    },
    ADJECTIVES() {
      return ADJECTIVES;
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
        sortBy,
        map,
        filter,
      };
    },
  },
  methods: {
    classRoute(name, params = {}) {
      if (this.classId) {
        params.classId = this.classId;
      }
      return router.getRoute(name, params);
    },
  },
};
