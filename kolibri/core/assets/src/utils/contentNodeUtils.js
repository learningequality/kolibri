import { MasteryModelTypes } from 'kolibri.coreVue.vuex.constants';

export function masteryModelValidator({ type, m, n }) {
  let isValid = true;
  const typeIsValid = Object.values(MasteryModelTypes).includes(type);
  if (!typeIsValid) {
    // eslint-disable-next-line no-console
    console.error(`Invalid mastery model type: ${type}`);
    isValid = false;
  }
  if (type === MasteryModelTypes.m_of_n) {
    if (typeof n !== 'number' || typeof m !== 'number') {
      // eslint-disable-next-line no-console
      console.error(`Invalid value of m and/or n. m: ${m}, n: ${n}`);
      isValid = false;
    }
  }
  return isValid;
}
