import { PageNames } from '../../constants';
import { _managePageTitle } from './helpers/mappers';
import preparePage from './helpers/preparePage';

export function showDataPage(store) {
  preparePage(store.dispatch, {
    name: PageNames.DATA_EXPORT_PAGE,
    title: _managePageTitle('Data'),
    isAsync: false,
  });
  store.dispatch('SET_PAGE_STATE', {});
}
