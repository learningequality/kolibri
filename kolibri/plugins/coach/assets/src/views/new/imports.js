import KModal from 'kolibri.coreVue.components.KModal';
import KButton from 'kolibri.coreVue.components.KButton';
import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
import KGrid from 'kolibri.coreVue.components.KGrid';
import KGridItem from 'kolibri.coreVue.components.KGridItem';
import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
import KSelect from 'kolibri.coreVue.components.KSelect';
import { coachStringsMixin } from './shared/commonCoachStrings';
import Answer from './shared/Answer';
import BackLink from './shared/BackLink';
import TruncatedItemList from './shared/TruncatedItemList';
import LessonActive from './shared/LessonActive';
import MasteryModel from './shared/MasteryModel';
import Recipients from './shared/Recipients';
import Score from './shared/Score';
import TimeDuration from './shared/TimeDuration';
import QuizActive from './shared/QuizActive';

import LearnerProgressRatio from './shared/status/LearnerProgressRatio';
import LearnerProgressCount from './shared/status/LearnerProgressCount';
import LearnerProgressLabel from './shared/status/LearnerProgressLabel';
import ItemStatusRatio from './shared/status/ItemStatusRatio';
import ItemStatusCount from './shared/status/ItemStatusCount';
import ItemStatusLabel from './shared/status/ItemStatusLabel';

export default {
  name: 'ReportsQuizHeader',
  components: {
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
  methods: {
    newCoachRoute(page) {
      return { name: 'NEW_COACH_PAGES', params: { page } };
    },
  },
};
