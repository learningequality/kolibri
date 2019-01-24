import { mapState, mapGetters } from 'vuex';
import CoreBase from 'kolibri.coreVue.components.CoreBase';
import KModal from 'kolibri.coreVue.components.KModal';
import KButton from 'kolibri.coreVue.components.KButton';
import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
import KGrid from 'kolibri.coreVue.components.KGrid';
import KGridItem from 'kolibri.coreVue.components.KGridItem';
import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
import KSelect from 'kolibri.coreVue.components.KSelect';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../constants';
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

import LearnerProgressRatio from './common/status/LearnerProgressRatio';
import LearnerProgressCount from './common/status/LearnerProgressCount';
import LearnerProgressLabel from './common/status/LearnerProgressLabel';
import ItemStatusRatio from './common/status/ItemStatusRatio';
import ItemStatusCount from './common/status/ItemStatusCount';
import ItemStatusLabel from './common/status/ItemStatusLabel';

export default {
  name: 'ReportsQuizHeader',
  components: {
    CoreBase,
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
    LearnerProgressRatio,
    LearnerProgressCount,
    LearnerProgressLabel,
    ItemStatusRatio,
    ItemStatusCount,
    ItemStatusLabel,
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
