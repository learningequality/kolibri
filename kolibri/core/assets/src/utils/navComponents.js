import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import logger from 'kolibri.lib.logging';
import plugin_data from 'plugin_data';

const logging = logger.getLogger(__filename);

const navComponents = [];

function checkDeclared(property) {
  return typeof property !== 'undefined' && property !== null;
}

function validatePriority(priority) {
  // Optional, must be an integer between 0 and +inf.
  // Note: closer to 0 is 'higher priority'
  return (
    !checkDeclared(priority) ||
    (typeof priority === 'number' && priority >= 0 && Number.isInteger(priority))
  );
}

function validateRole(role) {
  // Optional, must be one of the defined UserKinds
  return !checkDeclared(role) || Object.values(UserKinds).includes(role);
}

function validateSection(section) {
  // Optional, must be one of the defined NavComponentSections
  return !checkDeclared(section) || Object.values(NavComponentSections).includes(section);
}

function validateIfSoUD(role) {
  console.log(plugin_data);
  if (plugin_data['isSubsetOfUsersDevice']) {
    console.log('ok');
    return ![UserKinds.ADMIN, UserKinds.COACH].includes(role);
  } else {
    return true;
  }
}

function validateComponent(component) {
  return (
    validatePriority(component.priority) &&
    validateRole(component.role) &&
    validateSection(component.section) &&
    validateIfSoUD(component.role)
  );
}

navComponents.register = component => {
  if (!navComponents.includes(component)) {
    if (validateComponent(component)) {
      navComponents.push(component);
    } else {
      logging.error('Component has invalid priority, role, or section');
    }
  } else {
    logging.warn('Component has already been registered');
  }
};

export default navComponents;
