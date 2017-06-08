<template>
  <div class="my-button" :class="{
    flat: isFlat,
    raised: isRaised,
    primary: isPrimary
  }">
    <slot name="title"></slot>
  </div>
</template>

<script>

// export default {
module.exports = {
  name: "my-button",
  introduction: "A basic example button.",
  description: "A basic button with the ability to be flat, raised, or be a primary button. Nothing super special. (I stink at writing documentation.)",
  token: `<my-button isFlat isPrimary>Button Text</my-button>`,

  props: {
    isFlat: {
      type: Boolean,
      default: false,
      note: 'Whether or not to use the flat version of the button. (No gradient or outline.)'
    },

    isRaised: {
      type: Boolean,
      default: true,
      note: 'Whether or not to use the raised version of the button. (Has a drop shadow.)'
    },

    isPrimary: {
      type: Boolean,
      default: false,
      note: 'Whether or not to use the primary coloring.'
    }
  }
}

</script>
