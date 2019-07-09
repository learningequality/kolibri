import { MaxPointsPerContent } from '../../../constants';

export function facilityConfig(state) {
  return state.facilityConfig;
}

export function facilities(state) {
  return state.facilities;
}

export function getChannels(state) {
  return state.channels.list;
}

export function getChannelObject(state) {
  return function getter(channelId) {
    return getChannels(state).find(channel => channel.id === channelId);
  };
}

export function totalProgress(state) {
  return state.totalProgress;
}

export function totalPoints(state) {
  return state.totalProgress * MaxPointsPerContent;
}

export function pageSessionId(state) {
  return state.pageSessionId;
}

export function demoBannerVisible(state, getters, rootState) {
  return state.demoBannerVisible && rootState.pageName === 'SIGN_IN';
}
