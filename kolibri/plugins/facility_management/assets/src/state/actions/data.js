import { PageNames } from '../../constants';
import { _managePageTitle } from './helpers/mappers';
import preparePage from './helpers/preparePage';

export function showDataPage(store) {
  preparePage(store.commit, {
    name: PageNames.DATA_EXPORT_PAGE,
    title: _managePageTitle('Data'),
    isAsync: false,
  });
  store.commit('SET_PAGE_STATE', {});
}
