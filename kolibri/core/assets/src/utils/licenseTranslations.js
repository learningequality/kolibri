/*
  Define translations using LE Utils license names as keys
*/

import { createTranslator } from 'kolibri.utils.i18n';

const licenseShortNameStrings = {
  'CC BY': {
    message: 'CC BY',
    context:
      'Abbreviated name of the Creative Commons "BY" license.\nFor more info, see https://creativecommons.org/licenses/by/2.0/',
  },
  'CC BY-SA': {
    message: 'CC BY-SA',
    context:
      'Abbreviated name of the Creative Commons "BY-SA" license.\nFor more info, see https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'CC BY-ND': {
    message: 'CC BY-ND',
    context:
      'Abbreviated name of the Creative Commons "BY-ND" license.\nFor more info, see https://creativecommons.org/licenses/by-nd/2.0/',
  },
  'CC BY-NC': {
    message: 'CC BY-NC',
    context:
      'Abbreviated name of the Creative Commons "BY-NC" license.\nFor more info, see https://creativecommons.org/licenses/by-nc/2.0/',
  },
  'CC BY-NC-SA': {
    message: 'CC BY-NC-SA',
    context:
      'Abbreviated name of the Creative Commons "BY-NC-SA" license.\nFor more info, see https://creativecommons.org/licenses/by-nc-sa/2.0/',
  },
  'CC BY-NC-ND': {
    message: 'CC BY-NC-ND',
    context:
      'Abbreviated name of the Creative Commons "BY-NC-ND" license.\nFor more info, see https://creativecommons.org/licenses/by-nc-nd/2.0/',
  },
  'All Rights Reserved': {
    message: 'All rights reserved',
    context: 'For more info, see https://en.wikipedia.org/wiki/All_rights_reserved',
  },
  'Public Domain': {
    message: 'Public domain',
    context: 'For more info, see https://en.wikipedia.org/wiki/Public_domain',
  },
  'Special Permissions': {
    message: 'Special permissions',
    context: 'A special licensing arrangement was reached with the copyright owner',
  },
};

const licenseLongNameStrings = {
  'CC BY': {
    message: 'Creative Commons: attribution',
    context:
      'Long-form name of the Creative Commons "BY" license.\nFor more info, see https://creativecommons.org/licenses/by/2.0/',
  },
  'CC BY-SA': {
    message: 'Creative Commons: attribution, share-alike',
    context:
      'Long-form name of the Creative Commons "BY-SA" license.\nFor more info, see https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'CC BY-ND': {
    message: 'Creative Commons: attribution, no derivatives',
    context:
      'Long-form name of the Creative Commons "BY-ND" license.\nFor more info, see https://creativecommons.org/licenses/by-nd/2.0/',
  },
  'CC BY-NC': {
    message: 'Creative Commons: attribution, non-commercial',
    context:
      'Long-form name of the Creative Commons "BY-NC" license.\nFor more info, see https://creativecommons.org/licenses/by-nc/2.0/',
  },
  'CC BY-NC-SA': {
    message: 'Creative Commons: attribution, non-commercial, share-alike',
    context:
      'Long-form name of the Creative Commons "BY-NC-SA" license.\nFor more info, see https://creativecommons.org/licenses/by-nc-sa/2.0/',
  },
  'CC BY-NC-ND': {
    message: 'Creative Commons: attribution, non-commercial, no derivatives',
    context:
      'Long-form name of the Creative Commons "BY-NC-ND" license.\nFor more info, see https://creativecommons.org/licenses/by-nc-nd/2.0/',
  },
  'All Rights Reserved': {
    message: 'All rights reserved',
    context: 'For more info, see https://en.wikipedia.org/wiki/All_rights_reserved',
  },
  'Public Domain': {
    message: 'Public domain',
    context: 'For more info, see https://en.wikipedia.org/wiki/Public_domain',
  },
  'Special Permissions': {
    message: 'Special permissions',
    context: 'A special licensing arrangement was reached with the copyright owner',
  },
};

const licenseDescriptionConsumerStrings = {
  'CC BY': {
    message:
      'You may distribute, adapt, and build upon this resource – even commercially – as long as you give credit to the author.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by/2.0/',
  },
  'CC BY-SA': {
    message:
      'You may adapt and build upon this resource – even commercially – as long as you credit the author and license your new resources under identical terms. All new resources based on yours must also carry the same license.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'CC BY-ND': {
    message:
      'You may reuse the resource for any purpose, including commercially. However it cannot be adapted, and credit must be provided to the author.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-nd/2.0/',
  },
  'CC BY-NC': {
    message:
      'You may adapt and build upon this resource non-commercially. Your new resources must credit the author and also be non-commercial.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-nc/2.0/',
  },
  'CC BY-NC-SA': {
    message:
      'You may adapt, and build upon this resource non-commercially, as long as you give credit to the author and license your new resources under identical terms.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-nc-sa/2.0/',
  },
  'CC BY-NC-ND': {
    message:
      'You may download this resource and share it with others as long as you give credit to the author. You may not adapt it in any way or use it commercially.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-nc-sd/2.0/',
  },
  'All Rights Reserved': {
    message:
      'You may not distribute, adapt, or build upon this resource without permission from the copyright owner.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nFor more info, see https://en.wikipedia.org/wiki/All_rights_reserved',
  },
  'Public Domain': {
    message:
      'This resource is free of known restrictions under copyright law. You may distribute, adapt, and build upon this resource, even commercially.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nFor more info, see https://en.wikipedia.org/wiki/Public_domain',
  },
  'Special Permissions': {
    message:
      'This resource has a special license. Contact the owner of this license for a description of what you are allowed to do with it.',
    context:
      'License details from the perspective of the resource consumer or end-user.\nA special licensing arrangement was reached with the copyright owner',
  },
};

const licenseDescriptionCreatorStrings = {
  'CC BY': {
    message:
      'This license lets others distribute, adapt, and build upon your resource – even commercially – as long as they credit you for the original creation. This is the most accommodating of the Creative Commons licenses. Recommended for maximum dissemination and use of licensed materials.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by/2.0/',
  },
  'CC BY-SA': {
    message:
      'This license lets others adapt and build upon your resource – even commercially – as long as they credit you and license their new resources under identical terms. This license is often compared to “copyleft” free and open source software licenses. All new resources based on yours will carry the same license, so any derivatives will also allow commercial use. This is the license used by Wikipedia. It is recommended for materials that use resources from Wikipedia or similarly licensed projects.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'CC BY-ND': {
    message:
      'This license lets others reuse the resource for any purpose, including commercially. However it cannot be shared with others in adapted form, and credit must be provided to you.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-nd/2.0/',
  },
  'CC BY-NC': {
    message:
      'This license lets others adapt and build upon your resource non-commercially. Although their new derivative resources must credit you and be non-commercial, they don’t have to be licensed under the same terms.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-nc/2.0/',
  },
  'CC BY-NC-SA': {
    message:
      'This license lets others adapt and build upon your resource non-commercially, as long as they credit you and license their new resources under the identical terms.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-nc-sa/2.0/',
  },
  'CC BY-NC-ND': {
    message:
      'This license is the most restrictive of the six main Creative Commons licenses. It only allows others to download your resources and share them with others as long as they credit you, but they can’t change them in any way or use them commercially.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-nc-nd/2.0/',
  },
  'All Rights Reserved': {
    message:
      'You reserve all the rights provided by copyright law, and others may not legally distribute, adapt, or build upon this resource without your permission.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nFor more info, see https://en.wikipedia.org/wiki/All_rights_reserved',
  },
  'Public Domain': {
    message: 'This resource is free of known restrictions under copyright law.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nFor more info, see https://en.wikipedia.org/wiki/Public_domain',
  },
  'Special Permissions': {
    message:
      'This is a custom license to use when the other options do not apply. You are responsible for creating a description of what this license entails and communicating it with users.',
    context:
      'License details from the perspective of the resource creator, author, or copyright owner.\nA special licensing arrangement was reached with the copyright owner',
  },
};

const shortNameTranslator = createTranslator('ShortLicenseNames', licenseShortNameStrings);
const longNameTranslator = createTranslator('LongLicenseNames', licenseLongNameStrings);
const creatorDescriptionTranslator = createTranslator(
  'LicenseDescriptionsForCreators',
  licenseDescriptionCreatorStrings
);
const consumerDescriptionTranslator = createTranslator(
  'LicenseDescriptionsForConsumers',
  licenseDescriptionConsumerStrings
);

// Translated short-form license names
export function licenseShortName(leUtilsLicenseName) {
  if (licenseShortNameStrings[leUtilsLicenseName]) {
    return shortNameTranslator.$tr(leUtilsLicenseName);
  }
  return leUtilsLicenseName;
}

// Translated long-form license names
export function licenseLongName(leUtilsLicenseName) {
  if (licenseLongNameStrings[leUtilsLicenseName]) {
    return longNameTranslator.$tr(leUtilsLicenseName);
  }
  return leUtilsLicenseName;
}

// Translated license descriptions, aimed at creators of the content
export function licenseDescriptionForCreator(leUtilsLicenseName, leUtilsLicenseDescription) {
  if (licenseDescriptionCreatorStrings[leUtilsLicenseName]) {
    return creatorDescriptionTranslator.$tr(leUtilsLicenseName);
  }
  return leUtilsLicenseDescription;
}

// Translated license descriptions, aimed at users and consumers of the content
export function licenseDescriptionForConsumer(leUtilsLicenseName, leUtilsLicenseDescription) {
  if (licenseDescriptionConsumerStrings[leUtilsLicenseName]) {
    return consumerDescriptionTranslator.$tr(leUtilsLicenseName);
  }
  return leUtilsLicenseDescription;
}
