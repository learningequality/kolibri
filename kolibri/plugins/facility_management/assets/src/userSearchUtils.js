import orderBy from 'lodash/orderBy';

export function userMatchesFilter(user, searchFilter) {
  const searchTerms = searchFilter.split(/\s+/).map(val => val.toLowerCase());
  const fullName = user.full_name.toLowerCase();
  const username = user.username.toLowerCase();
  return searchTerms.every(term => fullName.includes(term) || username.includes(term));
}

export function filterAndSortUsers(users, pred) {
  return orderBy(users.filter(pred), [user => user.username.toUpperCase()], ['asc']);
}
