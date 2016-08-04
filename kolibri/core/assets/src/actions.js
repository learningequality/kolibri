const Kolibri = require('kolibri');

const ContentInteractionLogResource = Kolibri.resources.ContentInteractionLogResource;
const ContentSummaryLogResource = Kolibri.resources.ContentSummaryLogResource;

/**
 * Do a POST to start tracking
 * @param {object} payload
 */
function initTracking(store) {
  const data = {
    content_id: this.contentId,
    start_timestamp: this.start_timestamp,
    end_timestamp: this.end_timestamp,
    kind: this.kind,
    progress: this.progress,
    total_time: this.total_time,
    extra_fields: this.extra_fields,
    channel_id: this.channelId,
  };
  const ContentInteractionLogModel = ContentInteractionLogResource.createModel(data);
  const ContentSummaryLogModel = ContentSummaryLogResource.createModel(data);
  // const ContentSummaryLogModel = ContentSummaryLogResource.fetch({
  //   channel_id: this.channelId,
  //   content_id: this.contentId,
  //   //user_id: this.userId,
  // }).then((model) => {
  //   if (!model) {
  //     // ContentSummaryLogResource.createModel(data);
  //   }
  // });
  console.log('Summary:', ContentSummaryLogModel);
  console.log('Interaction:', ContentInteractionLogModel);

  // const newInteractionPromise = ContentInteractionLogModel.save(payload);
  // newInteractionPromise.then((model) => {
  //   // store.dispatch('ADD_INTERACTION_LOG', [model]);
  // }).catch((error) => {
  //   store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  // });
}

/**
 * Do a PATCH to update existing user
 * @param {string} id
 * @param {object} payload
 * @param {string} role
 */
function startTrackingProgress(store) {
  if (!this.start_timestamp) {
    this.start_timestamp = new Date();
  }
}

/**
 * Do a PATCH to update existing user
 * @param {string} id
 * @param {object} payload
 * @param {string} role
 */
function stopTrackingProgress(store) {
  this.end_timestamp = new Date();
}

/**
 * Do a PATCH to update existing user
 * @param {string} id
 * @param {object} payload
 * @param {string} role
 */
function updateProgress(store, id) {
  const data = {
    content_id: this.contentId,
    start_timestamp: this.start_timestamp,
    end_timestamp: this.end_timestamp,
    kind: this.kind,
    progress: this.progress,
    total_time: this.total_time,
    extra_fields: this.extra_fields,
    channel_id: this.channelId,
  };
  const ContentInteractionLogModel = ContentInteractionLogResource.createModel(data);
  console.log(ContentInteractionLogModel);
  // const FacilityUserModel = FacilityUserResource.getModel(id);
  // const oldRoldID = FacilityUserModel.attributes.roles.length ?
  //   FacilityUserModel.attributes.roles[0].id : null;
  // const oldRole = FacilityUserModel.attributes.roles.length ?
  //   FacilityUserModel.attributes.roles[0].kind : 'learner';

  // if (oldRole !== role) {
  // // the role changed
  //   if (oldRole === 'learner') {
  //   // role is admin or coach.
  //     const rolePayload = {
  //       user: id,
  //       collection: FacilityUserModel.attributes.facility,
  //       kind: role,
  //     };
  //     const RoleModel = RoleResource.createModel(rolePayload);
  //     RoleModel.save(rolePayload).then((newRole) => {
  //       FacilityUserModel.save(payload).then(responses => {
  //         // force role change because if the role is the only changing attribute
  //         // FacilityUserModel.save() will not send request to server.
  //         responses.roles = [newRole];
  //         store.dispatch('UPDATE_USERS', [responses]);
  //       })
  //       .catch((error) => {
  //         store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  //       });
  //     });
  //   } else if (role !== 'learner') {
  //   // oldRole is admin and role is coach or oldRole is coach and role is admin.
  //     const OldRoleModel = RoleResource.getModel(oldRoldID);
  //     OldRoleModel.delete(oldRoldID).then(() => {
  //     // create new role when old role is successfully deleted.
  //       const rolePayload = {
  //         user: id,
  //         collection: FacilityUserModel.attributes.facility,
  //         kind: role,
  //       };
  //       const RoleModel = RoleResource.createModel(rolePayload);
  //       RoleModel.save(rolePayload).then((newRole) => {
  //       // update the facilityUser when new role is successfully created.
  //         FacilityUserModel.save(payload).then(responses => {
  //           // force role change because if the role is the only changing attribute
  //           // FacilityUserModel.save() will not send request to server.
  //           responses.roles = [newRole];
  //           store.dispatch('UPDATE_USERS', [responses]);
  //         })
  //         .catch((error) => {
  //           store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  //         });
  //       });
  //     })
  //     .catch((error) => {
  //       store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  //     });
  //   } else {
  //   // role is learner and oldRole is admin or coach.
  //     const OldRoleModel = RoleResource.getModel(oldRoldID);
  //     OldRoleModel.delete(oldRoldID).then(() => {
  //       FacilityUserModel.save(payload).then(responses => {
  //         // force role change because if the role is the only changing attribute
  //         // FacilityUserModel.save() will not send request to server.
  //         responses.roles = [];
  //         store.dispatch('UPDATE_USERS', [responses]);
  //       })
  //       .catch((error) => {
  //         store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  //       });
  //     });
  //   }
  // } else {
  // // the role is not changed
  //   FacilityUserModel.save(payload).then(responses => {
  //     store.dispatch('UPDATE_USERS', [responses]);
  //   })
  //   .catch((error) => {
  //     store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  //   });
  // }
}

module.exports = {
  initTracking,
  startTrackingProgress,
  stopTrackingProgress,
  updateProgress,
};
