<template>

  <div>
    <KTextbox
      v-model="model1"
      label="Sample text field"
      :disabled="false"
      :required="true"
      :invalid="isInvalid"
      invalidText="The input is invalid"
      :maxlength="15"
      autocomplete="off"
      type="text"
    />

    <KTextbox
      v-model="model2"
      label="Disabled sample text field"
      :disabled="true"
      :maxlength="15"
    />
    <KTextbox
      v-model="model3"
      label="Text area"
      :textArea="true"
    />
  </div>

</template>


<script>

  import KTextbox from 'kolibri-components/src/KTextbox';

  export default {
    name: 'Example',
    components: { KTextbox },
    data: () => ({
      model1: '',
      model2: 'disabled',
      model3: '',
    }),
    computed: {
      isInvalid() {
        return this.model1 === 'invalid';
      },
    },
  };

</script>
