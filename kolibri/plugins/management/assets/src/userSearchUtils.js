export function userMatchesFilter(user, searchFilter) {
  const searchTerms = searchFilter.split(/\s+/).map(val => val.toLowerCase());
  const fullName = user.full_name.toLowerCase();
  const username = user.username.toLowerCase();
  return searchTerms.every(term => fullName.includes(term) || username.includes(term));
}
