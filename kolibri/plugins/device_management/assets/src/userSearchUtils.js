export function userMatchesFilter(user, searchFilter) {
  const searchTerms = searchFilter.split(/\s+/).map(val => val.toLowerCase());
  const fullName = user.full_name.toLowerCase();
  const username = user.username.toLowerCase();
  return searchTerms.every(term => fullName.includes(term) || username.includes(term));
}

export function filterAndSortUsers(users, pred) {
  return users.filter(pred).sort(
    // use 'search' option to ignore case rather than use locale defaults
    (user1, user2) => user1.localeCompare(user2, null, { usage: 'search' })
  );
}
