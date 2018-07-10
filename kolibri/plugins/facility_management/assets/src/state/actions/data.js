import { PageNames } from '../../constants';
import preparePage from './helpers/preparePage';

export function showDataPage(store) {
  preparePage(store.commit, {
    name: PageNames.DATA_EXPORT_PAGE,
    isAsync: false,
  });
  store.commit('SET_PAGE_STATE', {});
}
