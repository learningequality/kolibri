<template>

  <div
    class="attempt-box"
    :style="{ border: `2px solid ${selected ? $coreTextDefault : $coreTextDisabled }` }"
  >
    <template v-if="isAnswer">
      <mat-svg
        v-if="interaction.correct"
        class="svg-item"
        category="action"
        name="check_circle"
        :style="[svgItemBorder, { fill: $coreStatusCorrect }]"
      />
      <mat-svg
        v-if="!interaction.correct"
        class="svg-item"
        category="navigation"
        name="cancel"
        :style="[svgItemBorder, { fill: $coreStatusWrong }]"
      />
    </template>
    <mat-svg
      v-else-if="isHint"
      class="svg-item"
      category="action"
      name="lightbulb_outline"
      :style="[svgItemBorder, { fill: $coreTextAnnotation } ]"
    />
    <mat-svg
      v-else-if="isError"
      class="svg-item"
      category="alert"
      name="error_outline"
      :style="[svgItemBorder, { fill: $coreTextAnnotation } ]"
    />
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'InteractionItem',
    props: {
      interaction: {
        type: Object,
        required: true,
      },
      selected: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      ...mapGetters([
        '$coreTextAnnotation',
        '$coreStatusWrong',
        '$coreStatusCorrect',
        '$coreTextDisabled',
        '$coreTextDefault',
      ]),
      isAnswer() {
        return this.interaction.type === 'answer';
      },
      isHint() {
        return this.interaction.type === 'hint';
      },
      isError() {
        return this.interaction.type === 'error';
      },
      svgItemBorder() {
        return {
          borderBottom: `2px solid ${this.$coreTextDefault}`,
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .attempt-box {
    display: inline-block;
    float: left;
    width: 60px;
    height: 60px;
    padding: 10px;
    margin-right: 10px;
    cursor: pointer;
    border-radius: 10px;
  }

  .svg-item {
    width: auto;
    height: 38px;
    padding: 2px;
  }

</style>
