import mutations from '.';
import mapValues from 'lodash/mapValues';

function getMutationNames(mutations) {
  return mapValues(mutations, mutation => mutation.name);
}

export default getMutationNames(mutations);
