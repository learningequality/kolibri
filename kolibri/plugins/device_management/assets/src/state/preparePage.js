export default function preparePage(dispatch, { name, isAsync = true }) {
  dispatch('CORE_SET_PAGE_LOADING', isAsync);
  dispatch('SET_PAGE_NAME', name);
  dispatch('CORE_SET_ERROR', null);
}
