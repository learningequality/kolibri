import { createTranslator } from 'kolibri/utils/i18n';

const strings = createTranslator('RoutingTest', {
  hello: { message: 'Hello', context: 'A greeting' },
});

export default strings;
