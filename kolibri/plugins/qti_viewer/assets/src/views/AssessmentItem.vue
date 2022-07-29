<template>

  <div>
    {{ title }}

    <ItemBody
      v-if="itemBody"
      :key="identifier"
      :json="itemBody"
      @submit="$emit('submit', $event)"
    />
  </div>

</template>


<script>

  import jsonMixin from '../mixins/jsonMixin';
  import qtiMixin from '../mixins/qtiMixin';
  import ItemBody from './ItemBody';

  export default {
    name: 'AssessmentItem',
    components: {
      ItemBody,
    },
    mixins: [jsonMixin, qtiMixin],
    computed: {
      itemBody() {
        return this.json && this.json.itemBody && this.json.itemBody[0];
      },
      identifier() {
        return this.json && this.json['@identifier'];
      },
      title() {
        return (this.json && this.json['@title']) || '';
      },
    },
  };

</script>


<style lang="scss" scoped></style>
