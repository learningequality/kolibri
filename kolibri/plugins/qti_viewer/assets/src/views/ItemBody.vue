<template>

  <div>
    <div v-for="(child, index) in children" :key="index">
      <component
        :is="child.tagName"
        v-if="child.isInteraction"
        :json="child.json"
        @submit="$emit('submit', $event)"
      />
      <ZipHTML v-else :node="child.node" />
    </div>
  </div>

</template>


<script>

  import jsonMixin from '../mixins/jsonMixin';
  import qtiMixin from '../mixins/qtiMixin';
  import ItemLoadingError from './ItemLoadingError.vue';
  import ChoiceInteraction from './interactions/ChoiceInteraction';
  import ZipHTML from './ZipHTML';

  const SupportedInteractions = {
    choiceInteraction: () => import('./interactions/ChoiceInteraction'),
  };

  for (let interaction in SupportedInteractions) {
    SupportedInteractions[interaction] = () => ({
      // The component to load (should be a Promise)
      component: SupportedInteractions[interaction],
      // A component to use while the async component is loading
      loading: 'ContentRendererLoading',
      // A component to use if the load fails
      error: ItemLoadingError,
      // Delay before showing the loading component. Default: 200ms.
      delay: 200,
      // The error component will be displayed if a timeout is
      // provided and exceeded. Default: Infinity.
      timeout: 30000,
    });
  }

  export default {
    name: 'ItemBody',
    components: { ZipHTML, ChoiceInteraction },
    mixins: [jsonMixin, qtiMixin],
    computed: {
      children() {
        if (this.json && this.getDom()) {
          let DOM;
          if (this.json['@id']) {
            DOM = this.getDom().querySelector(`itemBody#${this.json['@id']}`);
          } else {
            DOM = this.getDom().querySelector('itemBody');
          }
          return Array.from(DOM.children).map(node => {
            const tagName = node.tagName;
            const isInteraction = this.isSupportedInteraction(tagName);
            const output = {
              isInteraction,
              node,
              tagName,
            };
            if (isInteraction) {
              const id = node.getAttribute('id');
              output.json = this.json[tagName].find(item => item['@id'] === id);
            }
            return output;
          });
        }
        return [];
      },
    },
    methods: {
      isSupportedInteraction(tagName) {
        return Boolean(SupportedInteractions[tagName]);
      },
    },
  };

</script>
