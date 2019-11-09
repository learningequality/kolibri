/*
  Look up translations based on LE Utils license names
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
      'You may distribute, remix, tweak, and build upon this work, even commercially, as long as you give credit to the creator.',
    context:
      'License details from the perspective of the content consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'CC BY-SA': {
    message:
      'You may remix, tweak, and build upon this work, even for commercial purposes, as long as you give credit and license your new creations under identical terms. This license is often compared to “copyleft” free and open source software licenses. All new works based on yours will carry the same license, so any derivatives will also allow commercial use.',
    context:
      'License details from the perspective of the content consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-nd/2.0/',
  },
  'CC BY-ND': {
    message:
      'You may reuse the work for any purpose, including commercially; however, it cannot be shared with others in adapted form, and credit must be provided to the creator.',
    context:
      'License details from the perspective of the content consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-nc/2.0/',
  },
  'CC BY-NC': {
    message:
      'You may remix, tweak, and build upon this work non-commercially. Although your new works must also acknowledge the creator and be non-commercial, they don’t have to license their derivative works on the same terms.',
    context:
      'License details from the perspective of the content consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-nc-sa/2.0/',
  },
  'CC BY-NC-SA': {
    message:
      'You may remix, tweak, and build upon this work non-commercially, as long as you give credit to the creator and license your new creations under the identical terms.',
    context:
      'License details from the perspective of the content consumer or end-user.\nFor more info, see https://creativecommons.org/licenses/by-nc-nd/2.0/',
  },
  'CC BY-NC-ND': {
    message:
      'You may download this work and share it with others as long as you give credit to the creator. You may not change it in any way or use it commercially.',
    context:
      'License details from the perspective of the content consumer or end-user.\nFor more info, see https://en.wikipedia.org/wiki/All_rights_reserved',
  },
  'All Rights Reserved': {
    message:
      'The copyright holder reserves, or holds for their own use, all the rights provided by copyright law. You may not distribute, remix, tweak, or build upon this work without permission from the copyright owner.',
    context:
      'License details from the perspective of the content consumer or end-user.\nFor more info, see https://en.wikipedia.org/wiki/All_rights_reserved',
  },
  'Public Domain': {
    message:
      'This work is free of known restrictions under copyright law, including all related and neighboring rights. You may distribute, remix, tweak, and build upon this work, even commercially',
    context:
      'License details from the perspective of the content consumer or end-user.\nFor more info, see https://en.wikipedia.org/wiki/Public_domain',
  },
  'Special Permissions': {
    message:
      'This content has a special license. Contact the owner of this license for a description of what this license entails.',
    context:
      'License details from the perspective of the content consumer or end-user.\nA special licensing arrangement was reached with the copyright owner',
  },
};

const licenseDescriptionCreatorStrings = {
  'CC BY': {
    message:
      'This license lets others distribute, remix, tweak, and build upon your work, even commercially, as long as they credit you for the original creation. This is the most accommodating of the Creative Commons licenses. Recommended for maximum dissemination and use of licensed materials.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-sa/2.0/',
  },
  'CC BY-SA': {
    message:
      'This license lets others remix, tweak, and build upon your work even for commercial purposes, as long as they credit you and license their new creations under the identical terms. This license is often compared to “copyleft” free and open source software licenses. All new works based on yours will carry the same license, so any derivatives will also allow commercial use. This is the license used by Wikipedia, and is recommended for materials that would benefit from incorporating content from Wikipedia and similarly licensed projects.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-nd/2.0/',
  },
  'CC BY-ND': {
    message:
      'This license lets others reuse the work for any purpose, including commercially; however, it cannot be shared with others in adapted form, and credit must be provided to you.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-nc/2.0/',
  },
  'CC BY-NC': {
    message:
      'This license lets others remix, tweak, and build upon your work non-commercially, and although their new works must also acknowledge you and be non-commercial, they don’t have to license their derivative works on the same terms.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-nc-sa/2.0/',
  },
  'CC BY-NC-SA': {
    message:
      'This license lets others remix, tweak, and build upon your work non-commercially, as long as they credit you and license their new creations under the identical terms.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nFor more info, see https://creativecommons.org/licenses/by-nc-nd/2.0/',
  },
  'CC BY-NC-ND': {
    message:
      'This license is the most restrictive of the six main Creative Commons licenses, only allowing others to download your works and share them with others as long as they credit you, but they can’t change them in any way or use them commercially.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nFor more info, see https://en.wikipedia.org/wiki/All_rights_reserved',
  },
  'All Rights Reserved': {
    message: 'You reserve, or holds for your own use, all the rights provided by copyright law.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nFor more info, see https://en.wikipedia.org/wiki/All_rights_reserved',
  },
  'Public Domain': {
    message:
      'This work has been identified as being free of known restrictions under copyright law, including all related and neighboring rights.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nFor more info, see https://en.wikipedia.org/wiki/Public_domain',
  },
  'Special Permissions': {
    message:
      'Special Permissions is a custom license to use when the current licenses do not apply to the content. You are responsible for creating a description of what this license entails.',
    context:
      'License details from the perspective of the content creator, author, or copyright owner.\nA special licensing arrangement was reached with the copyright owner',
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
