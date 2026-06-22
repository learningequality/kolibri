import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';
import client from 'kolibri/client';

export default new Resource({
  name: 'classsummary',
  namespace: 'kolibri.plugins.coach',
  /**
   * Resolve a scanned QR login token to a learner in the given class. Matching
   * happens server-side so the full set of learner login tokens is never sent
   * to the browser. Resolves to { id, name } or rejects (404) when the token
   * does not belong to a learner in this class.
   */
  resolveQr(classId, qrLoginToken) {
    return client({
      url: urls['kolibri:kolibri.plugins.coach:classsummary_resolve_qr'](classId),
      method: 'POST',
      data: { qr_login_token: qrLoginToken },
    });
  },
});
