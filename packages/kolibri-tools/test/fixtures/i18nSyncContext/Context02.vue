<template>

  <div>Context02</div>

</template>

<script>

  /**
   * This file includes context object definitions.
   */
  import { createTranslator } from 'kolibri.utils.i18n';

  /* eslint-disable-next-line */
  const extraTranslator = createTranslator('Context03', {
    thirdAction: 'Third',
  });

  export default {
    name: 'Context02',
    $trs: {
      // Should be left alone unless the context changes.
      testAction: {
        string: 'Test',
        context: 'For testing actions',
      },
      // Should be converted to a string unless context is defined
      noContextObject: {
        string: `Just a string here...`, // TemplateLiteral
      },
    },
  };

</script>
