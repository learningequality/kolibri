
const UserKinds = require('./constants').UserKinds;

function isAdminOrSuperuser(state) {
  const kind = state.core.session.kind;
  if (kind[0] === UserKinds.SUPERUSER || kind[0] === UserKinds.ADMIN) {
    return true;
  }
  return false;
}

module.exports = {
  isAdminOrSuperuser,
};
