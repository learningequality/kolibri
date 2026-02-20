import client from 'kolibri/client';
import urls from 'kolibri/urls';

function remoteFacilityUserData(baseurl, facility_id, username, password, userAdmin = null) {
  const params = {
    baseurl: baseurl,
    facility_id: facility_id,
    username: userAdmin === null ? username : userAdmin,
    password: password,
  };
  return client({
    url: urls['kolibri:core:remotefacilityauthenticateduserinfo'](),
    method: 'POST',
    data: params,
  })
    .then(response => {
      const user_info = response.data.find(element => element.username === username);
      return user_info;
    })
    .catch(() => {
      return 'error';
    });
}

const remoteFacilityUsers = function (baseurl, facility_id, username) {
  const params = {
    baseurl: baseurl,
    facility: facility_id,
    username: username,
  };
  return client({
    url: urls['kolibri:core:remotefacilityuser'](),
    params: params,
  }).then(response => {
    let users = response.data;
    if (Object.keys(response.data).length === 0) users = [];
    return { users: users };
  });
};
export default remoteFacilityUserData;
export { remoteFacilityUsers };
