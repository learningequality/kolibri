import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

const coreBannerContent = [];

/**
 * coreBannerContent provides a way to register components
 * to be used as the content for the CoreBanner component.
 */
coreBannerContent.register = component => {
  if (!coreBannerContent.includes(component)) {
    coreBannerContent.push(component);
  } else {
    logging.warn('Component has already been registered.');
  }
};

export default coreBannerContent;
