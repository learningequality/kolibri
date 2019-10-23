import { PageNames } from '../../constants';

export function showProfilePage(store) {
  store.dispatch('resetAndSetPageName', {
    pageName: PageNames.PROFILE,
  });
}
