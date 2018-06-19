import ClassroomResource from './classroom';
import ContentNodeResource from './contentNode';
import ContentNodeGranular from './contentNodeGranular';
import ContentNodeSlim from './contentNodeSlim';
import FacilityUserResource from './facilityUser';
import FacilityUsernameResource from './facilityUsername';
import LearnerGroupResource from './learnerGroup';
import MembershipResource from './membership';
import RoleResource from './role';
import ContentSessionLogResource from './contentSessionLog';
import ContentSummaryLogResource from './contentSummaryLog';
import SessionResource from './session';
import FacilityResource from './facility';
import TaskResource from './task';
import ChannelResource from './channel';
import MasteryLogResource from './masteryLog';
import AttemptLogResource from './attemptLog';
import SignUpResource from './signUp';
import ExamResource from './exam';
import ExamAssignmentResource from './examassignment';
import UserExamResource from './userexam';
import ExamLogResource from './examLog';
import ExamAttemptLogResource from './examAttemptLog';
import FacilityDatasetResource from './facilityDataset';
import UserProgressResource from './userProgress';
import ContentNodeProgressResource from './contentNodeProgress';
import DeviceProvisionResource from './deviceProvision';
import DevicePermissionsResource, { NewDevicePermissionsResource } from './devicePermissions';
import RemoteChannel from './remoteChannel';
import Lesson from './lesson';

const classroomResource = new ClassroomResource();
const contentNodeResource = new ContentNodeResource();
const facilityUserResource = new FacilityUserResource();
const facilityUsernameResource = new FacilityUsernameResource();
const learnerGroupResource = new LearnerGroupResource();
const membershipResource = new MembershipResource();
const roleResource = new RoleResource();
const contentSessionLogResource = new ContentSessionLogResource();
const contentSummaryLogResource = new ContentSummaryLogResource();
const sessionResource = new SessionResource();
const facilityResource = new FacilityResource();
const taskResource = new TaskResource();
const channelResource = new ChannelResource();
const masteryLogResource = new MasteryLogResource();
const attemptLogResource = new AttemptLogResource();
const signUpResource = new SignUpResource();
const examResource = new ExamResource();
const examAssignmentResource = new ExamAssignmentResource();
const userExamResource = new UserExamResource();
const examLogResource = new ExamLogResource();
const examAttemptLogResource = new ExamAttemptLogResource();
const facilityDatasetResource = new FacilityDatasetResource();
const userProgressResource = new UserProgressResource();
const contentNodeProgressResource = new ContentNodeProgressResource();
const deviceProvisionResource = new DeviceProvisionResource();
const devicePermissionsResource = new DevicePermissionsResource();
const newDevicePermissionsResource = new NewDevicePermissionsResource();
const ContentNodeGranularResource = new ContentNodeGranular();
const ContentNodeSlimResource = new ContentNodeSlim();
const RemoteChannelResource = new RemoteChannel();
const LessonResource = new Lesson();

export {
  classroomResource as ClassroomResource,
  contentNodeResource as ContentNodeResource,
  ContentNodeGranularResource,
  ContentNodeSlimResource,
  RemoteChannelResource,
  LessonResource,
  facilityUserResource as FacilityUserResource,
  facilityUsernameResource as FacilityUsernameResource,
  learnerGroupResource as LearnerGroupResource,
  membershipResource as MembershipResource,
  roleResource as RoleResource,
  contentSessionLogResource as ContentSessionLogResource,
  contentSummaryLogResource as ContentSummaryLogResource,
  sessionResource as SessionResource,
  facilityResource as FacilityResource,
  taskResource as TaskResource,
  channelResource as ChannelResource,
  masteryLogResource as MasteryLogResource,
  attemptLogResource as AttemptLogResource,
  signUpResource as SignUpResource,
  examResource as ExamResource,
  examAssignmentResource as ExamAssignmentResource,
  userExamResource as UserExamResource,
  examLogResource as ExamLogResource,
  examAttemptLogResource as ExamAttemptLogResource,
  facilityDatasetResource as FacilityDatasetResource,
  userProgressResource as UserProgressResource,
  contentNodeProgressResource as ContentNodeProgressResource,
  deviceProvisionResource as DeviceProvisionResource,
  devicePermissionsResource as DevicePermissionsResource,
  newDevicePermissionsResource as NewDevicePermissionsResource,
};
