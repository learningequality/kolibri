<template>

  <div class="wrapper">
    <div class="handle" :style="{ right: hidden ? '-75px' : '179px' }">
      <button @click="toggleHidden">Kolibri Colour Picker</button>
    </div>
    <div v-if="!hidden" class="popout">
      <div v-if="!currentValue">
        <div
          v-for="(title, colour) in themeColours"
          :key="colour"
          class="row"
          @click="setCurrentValue(colour)"
        >
          <div
            class="square"
            :style="{ backgroundColor: getValue(colour) }"
          >
          </div>
          {{ title }}
        </div>
      </div>
      <div v-else class="selector">
        <h1>{{ themeColours[currentValue] }}</h1>
        <Picker :value="theme[currentValue]" @input="setColourValue" />
        <KButton @click="resetState">Reset</KButton>
        <KButton :primary="true" @click="setCurrentValue(null)">Done</KButton>
      </div>
    </div>
  </div>

</template>


<script>

  import { Chrome } from 'vue-color';
  import KButton from 'kolibri.coreVue.components.KButton';
  import { dynamicState, resetThemeValue } from '../styles/theme';

  const themeColours = {
    '$core-action-light': 'Core Action Light',
    '$core-action-dark': 'Core Action Dark',
    '$core-accent-color': 'Core Accent Color',
    '$core-bg-canvas': 'Core Background Canvas',
    '$core-text-default': 'Core Text Default',
    '$core-bg-warning': 'Core Background Warning',
    '$core-text-error': 'Core Text Error',
    '$core-bg-error': 'Core Background Error',
    '$core-status-progress': 'Core Status: Progress',
    '$core-status-mastered': 'Core Status: Mastered',
    '$core-status-correct': 'Core Status: Correct',
    '$core-status-wrong': 'Core Status: Wrong',
    '$core-grey': 'Core Grey',
    '$core-loading': 'Core Loading',
  };

  export default {
    name: 'ColourPicker',
    components: {
      KButton,
      Picker: Chrome,
    },
    data() {
      return {
        themeColours,
        currentValue: null,
        hidden: true,
      };
    },
    computed: {
      theme() {
        return dynamicState;
      },
    },
    methods: {
      setCurrentValue(value) {
        this.currentValue = value;
      },
      setColourValue(value) {
        if (this.currentValue && value) {
          dynamicState[this.currentValue] = value.hex8;
        }
      },
      resetState() {
        if (this.currentValue) {
          resetThemeValue(this.currentValue);
        }
      },
      getValue(key) {
        return this.theme[key];
      },
      toggleHidden() {
        this.hidden = !this.hidden;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .wrapper {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 100;
    height: 100%;
    color: black;
  }

  .handle {
    position: fixed;
    top: 150px;
    padding: 10px;
    background-color: white;
    border: gray 1px solid;
    border-bottom: 0;
    border-radius: 5px 5px 0 0;
    box-shadow: 3px -3px 3px 0 #9b9b9b;
    transform: rotate(-90deg);
  }

  .popout {
    width: 250px;
    height: 100%;
    padding: 10px;
    overflow-x: hidden;
    overflow-y: scroll;
    background-color: white;
    border-radius: 5px;
    box-shadow: 1px -1px 15px 5px grey;
  }

  .row {
    display: flex;
    padding: 10px 5px;
    cursor: pointer;
  }

  .square {
    width: 25px;
    height: 25px;
    margin-right: 3px;
  }

</style>
