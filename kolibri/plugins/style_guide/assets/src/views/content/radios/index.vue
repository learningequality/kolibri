<template>

  <page-template title="Radios" :completed="false">

    <h2><code>{{ kRadioApi.name }}</code> API</h2>
    <component-docs :api="kRadioApi" />

    <h2>Code Example</h2>
    <vue-example :code="example" />

    <h2>Guidelines</h2>
    <p>
      In particular, radio buttons aid the user when they need to see all
      available options side-by-side
    </p>
    <p>
      If it is not necessary to see all available options, a dropdown may be
      used
    </p>
    <p>
      Selected state of controls generally denote "positives"
      (yes/selected/etc.)
    </p>

    <h3>Do not</h3>
    <ul>
      <li>
        Use radio buttons as a filter in a table or a list
      </li>
      <li>
        Nest radio buttons
      </li>
    </ul>

    <h3>Style</h3>
    <p>
      Kolibri utilizes the default styles + padding from Keen UI
    </p>
    <p>
      Selected option is the action color, other available options are dark
      grey
    </p>
    <p>
      Where possible, avoid using icons with radio buttons. If necessary, the
      icon should sit within the label area, pushing the label to the right.
    </p>

    <h3>Labels & option text:</h3>
    <p>
      Keep these short, concise, and easy for the user to understand. Should
      not be structured as a sentence.
    </p>

    <h3>Layout</h3>
    <p>
      Radio buttons are always left-aligned
    </p>
    <p>
      No inset padding, radio buttons left-align with the content of their
      container
    </p>
    <p>
      Radio buttons are vertically stacked
    </p>ls should be short and concise. Should not be sentences.

  </page-template>

</template>


<script>

  import componentDocs from '../../shell/component-docs';
  import vueExample from '../../shell/vue-example';
  import pageTemplate from '../../shell/page-template';

  import example from 'raw-loader!./example.html';
  import kRadioApi from '!vue-doc!kolibri.coreVue.components.kRadio';

  import FullVue from 'vue/dist/vue.common';
  import kRadio from 'kolibri.coreVue.components.kRadio';
  FullVue.component('k-radio', kRadio);

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
    },
    data: () => ({
      kRadioApi,
      example,
    }),
  };

</script>


<style lang="stylus" scoped></style>
