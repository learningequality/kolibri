export default function preparePage(dispatch, { name, title, isAsync = true }) {
  dispatch('CORE_SET_PAGE_LOADING', isAsync);
  dispatch('SET_PAGE_NAME', name);
  dispatch('CORE_SET_TITLE', title);
  dispatch('CORE_SET_ERROR', null);
}
