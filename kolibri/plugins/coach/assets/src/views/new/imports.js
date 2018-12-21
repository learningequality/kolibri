import KButton from 'kolibri.coreVue.components.KButton';
import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
import KSelect from 'kolibri.coreVue.components.KSelect';
import BackLink from './shared/BackLink';
import Completed from './shared/status/Completed';
import EnrolledGroups from './shared/EnrolledGroups';
import InProgress from './shared/status/InProgress';
import LessonActive from './shared/LessonActive';
import MasteryModel from './shared/MasteryModel';
import NeedHelp from './shared/status/NeedHelp';
import NotStarted from './shared/status/NotStarted';
import Recipients from './shared/Recipients';
import Score from './shared/Score';
import TimeDuration from './shared/TimeDuration';
import QuestionOrder from './shared/QuestionOrder';
import QuizActive from './shared/QuizActive';

export default {
  name: 'ReportsQuizHeader',
  components: {
    KButton,
    KCheckbox,
    KDropdownMenu,
    KRouterLink,
    KSelect,
    BackLink,
    Completed,
    EnrolledGroups,
    InProgress,
    LessonActive,
    MasteryModel,
    NeedHelp,
    NotStarted,
    Recipients,
    Score,
    TimeDuration,
    QuestionOrder,
    QuizActive,
  },
};
