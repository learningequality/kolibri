import { ContentNodeResource, MembershipResource, FacilityUserResource } from 'kolibri.resources';
import router from 'kolibri.coreVue.router';
import { DemographicConstants } from 'kolibri.coreVue.vuex.constants';
import { PageNames, pageNameToModuleMap } from '../../constants';

const { DEFERRED } = DemographicConstants;

export function resetModuleState(store, lastPageName) {
  const moduleName = pageNameToModuleMap[lastPageName];
  if (moduleName) {
    store.commit(`${moduleName}/RESET_STATE`);
  }
}

export function setAndCheckChannels(store) {
  return store.dispatch('setChannelInfo').then(
    channels => {
      if (!channels.length) {
        router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
      }
      return channels;
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}

export function getCopies(store, contentId) {
  return new Promise((resolve, reject) => {
    ContentNodeResource.fetchCopies(contentId)
      .then(copies => resolve(copies))
      .catch(error => reject(error));
  });
}

export function setFacilitiesAndConfig(store) {
  return store.dispatch('getFacilities').then(() => {
    return store.dispatch('getFacilityConfig');
  });
}

// prepares state that is used for all pages in 'learn' plugin/app
// currently, this is only the user's memberships
export function prepareLearnApp(store) {
  const userId = store.getters.currentUserId;

  if (userId === null) return Promise.resolve();

  const membershipPromise = MembershipResource.fetchCollection({
    getParams: {
      user: userId,
    },
  });

  return membershipPromise
    .then(memberships => {
      store.commit('LEARN_SET_MEMBERSHIPS', memberships);
    })
    .catch(err => {
      store.commit('CORE_SET_ERROR', err);
    });
}

export function getDemographicInfo(store) {
  return FacilityUserResource.fetchModel({ id: store.getters.currentUserId }).then(facilityUser => {
    return {
      gender: facilityUser.gender,
      birth_year: facilityUser.birth_year,
    };
  });
}

// Sets FacilityUser.gender to 'DEFERRED'. See getDemographicInfo above.
export function deferProfileUpdates(store, demographicInfo) {
  return FacilityUserResource.saveModel({
    id: store.getters.currentUserId,
    data: {
      gender: demographicInfo.gender || DEFERRED,
      birth_year: demographicInfo.birth_year || DEFERRED,
    },
  });
}
