import { Resource } from 'kolibri.lib.apiResource';

export const NetworkLocationResource = new Resource({
  name: 'networklocation',
});

export const StaticNetworkLocationResource = new Resource({
  name: 'staticnetworklocation',
});

export const DynamicNetworkLocationResource = new Resource({
  name: 'dynamicnetworklocation',
});

export { default as ClassroomResource } from './classroom';
export { default as ContentNodeResource } from './contentNode';
export { default as ContentNodeGranularResource } from './contentNodeGranular';
export { default as ContentNodeSearchResource } from './contentNodeSearch';
export { default as FacilityUserResource } from './facilityUser';
export { default as FacilityUsernameResource } from './facilityUsername';
export { default as LearnerGroupResource } from './learnerGroup';
export { default as MembershipResource } from './membership';
export { default as RoleResource } from './role';
export { default as ContentSessionLogResource } from './contentSessionLog';
export { default as ContentSummaryLogResource } from './contentSummaryLog';
export { default as SessionResource } from './session';
export { default as FacilityResource } from './facility';
export { default as TaskResource } from './task';
export { default as FacilityTaskResource } from './facilityTask';
export { default as ChannelResource } from './channel';
export { default as MasteryLogResource } from './masteryLog';
export { default as ExamResource } from './exam';
export { default as ExamLogResource } from './examLog';
export { default as ExamAttemptLogResource } from './examAttemptLog';
export { default as FacilityDatasetResource } from './facilityDataset';
export { default as UserProgressResource } from './userProgress';
export { default as ContentNodeProgressResource } from './contentNodeProgress';
export { default as DevicePermissionsResource } from './devicePermissions';
export { default as RemoteChannelResource } from './remoteChannel';
export { default as LessonResource } from './lesson';
export { default as AttemptLogResource } from './attemptLog';
export { default as PingbackNotificationResource } from './pingbackNotification';
export { default as PingbackNotificationDismissedResource } from './pingbackNotificationDismissed';
export { default as PortalResource } from './portal';
