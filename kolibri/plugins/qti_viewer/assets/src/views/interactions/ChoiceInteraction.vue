<template>

  <form>
    <p v-for="prompt in prompts" :key="prompt['@id']">
      {{ prompt['#text'] }}
    </p>

    <component
      :is="choiceComponent"
      v-for="choice in choices"
      :key="choice.value"
      :label="''"
      :showLabel="false"
      :value="choice.value"
      :currentValue="response"
      @change="response = choice.value"
    >
      <ZipHTML v-for="(node, index) in choice.nodes" :key="index" :node="node" />
    </component>

  </form>

</template>


<script>

  import shuffled from 'kolibri.utils.shuffled';
  import jsonMixin from '../../mixins/jsonMixin';
  import qtiMixin from '../../mixins/qtiMixin';
  import ZipHTML from '../ZipHTML';

  export default {
    name: 'ChoiceInteraction',
    components: {
      ZipHTML,
    },
    mixins: [jsonMixin, qtiMixin],
    data() {
      return {
        response: '',
      };
    },
    computed: {
      choiceComponent() {
        return this.isMultiple ? 'KCheckBox' : 'KRadioButton';
      },
      prompts() {
        // Not sure there could ever be more than one.
        return this.json.prompts || [];
      },
      choices() {
        let shuffle = this.json['@shuffle'];

        const choices = this.json.simpleChoice.map(choice => {
          shuffle = shuffle && !choice['@fixed'];
          const id = choice['@id'];
          let DOM;
          if (id) {
            DOM = this.getDom().querySelector(`simpleChoice#${id}`);
          } else {
            DOM = this.getDom().querySelector('simpleChoice');
          }
          return {
            value: choice['@identifier'],
            nodes: Array.from(DOM.children || []),
            textContent: DOM.textContent,
          };
        });
        if (shuffle) {
          return shuffled(choices);
        }
        return choices;
      },
      isMultiple() {
        return this.json && this.json['@maxChoices'] > 1;
      },
    },
    watch: {
      response() {
        this.$emit('$submit', this.response);
      },
    },
    mounted() {
      this.response = this.responseForCurrentItem || '';
    },
  };

</script>


<style></style>
