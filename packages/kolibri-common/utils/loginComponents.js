import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

const loginComponents = [];

loginComponents.register = component => {
  if (!loginComponents.includes(component)) {
    loginComponents.push(component);
  } else {
    logging.warn('Component has already been registered');
  }
};

export default loginComponents;
