import { localeCompare } from 'kolibri.utils.i18n';

export function userMatchesFilter(user, searchFilter) {
  const searchTerms = searchFilter.split(/\s+/).map(val => val.toLowerCase());
  const fullName = user.full_name.toLowerCase();
  const username = user.username.toLowerCase();
  return searchTerms.every(term => fullName.includes(term) || username.includes(term));
}

export function filterAndSortUsers(users, pred = () => true, sortByKey = 'full_name') {
  return users.filter(pred).sort(
    // use 'search' option to ignore case rather than use locale defaults
    (a, b) => {
      return localeCompare(a[sortByKey], b[sortByKey]);
    }
  );
}
