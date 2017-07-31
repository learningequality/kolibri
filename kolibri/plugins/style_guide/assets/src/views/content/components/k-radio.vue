<template>

  <component-template :codeExamplesTemplate="kRadioExample" :api="kRadioApi" :isComplete="false">
    <div slot="guidelines">

      <h3>Usage</h3>
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
      </p>

    </div>
  </component-template>

</template>


<script>

  import FullVue from 'vue/dist/vue.common';
  import componentTemplate from '../../shell/component-template';
  import kRadio from 'kolibri.coreVue.components.kRadio';
  import kRadioApi from '!vue-doc!kolibri.coreVue.components.kRadio';
  FullVue.component('k-radio', kRadio);
  import kRadioExample from 'raw-loader!./k-radio-example.html';

  export default {
    components: {
      componentTemplate,
    },
    data: () => ({
      kRadioApi,
      kRadioExample,
    }),
  };

</script>


<style lang="stylus"></style>
