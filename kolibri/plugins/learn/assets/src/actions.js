const Kolibri = require('kolibri');

const fetchFullContent = ({ dispatch }, id) => {
  const contentModel = Kolibri.resources.getResource('contentmetadata').getModel(id);
  if (contentModel.synced) {
    dispatch('SET_FULL_CONTENT', contentModel.attributes);
  } else {
    contentModel.fetch().then(() => {
      dispatch('SET_FULL_CONTENT', contentModel.attributes);
    });
  }
};

module.exports = {
  fetchFullContent,
};
