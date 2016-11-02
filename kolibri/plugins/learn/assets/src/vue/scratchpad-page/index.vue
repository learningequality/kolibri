<template>

  <div>
    <h1>Exercise Attempt Visualization</h1>
    <p>Demo of CSS transitions</p>
    <ul>
      <li>N: <input type="number" v-model="N"></li>
      <li>
        Log:
        <button
          class="answer"
          @click="right"
          :disabled="!waiting || success"> ✓
        </button>
        <button
          class="answer"
          @click="wrong"
          :disabled="!waiting || success"> x
        </button>
        <button
          class="answer"
          @click="hint"
          :disabled="!waiting || success"> ?
        </button>
        <button
          @click="next"
          :disabled="waiting || success"> next
        </button>
      </li>
      <li>success: <input type="checkbox" v-model="success"></li>
      <li><button @click="clear">clear</button></li>
    </ul>
    <hr>
    <div>
      <exercise-attempts
        :waiting="waiting"
        :success="success"
        :numspaces="parseInt(N)"
        :log="log"
      >
      </exercise-attempts>
    </div>
  </div>

</template>


<script>

  const AnswerTypes = require('./exercise-attempts/constants').AnswerTypes;


  module.exports = {
    components: {
      'exercise-attempts': require('./exercise-attempts'),
    },
    methods: {
      clear() {
        // http://stackoverflow.com/a/1232046
        this.log.splice(0, this.log.length);
        this.waiting = true;
      },
      right() {
        this.log.push(AnswerTypes.RIGHT);
        this.waiting = false;
      },
      wrong() {
        this.log.push(AnswerTypes.WRONG);
        this.waiting = false;
      },
      hint() {
        this.log.push(AnswerTypes.HINT);
        this.waiting = false;
      },
      next() {
        this.waiting = true;
      },
    },
    data() {
      return {
        waiting: true,
        success: false,
        // M: 4,
        N: 6,
        log: [
          AnswerTypes.HINT,
          AnswerTypes.RIGHT,
          AnswerTypes.WRONG,
        ],
      };
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  h1
    margin-top: 80px

  li
    margin-bottom: 8px

  .answer
    width: 25px

</style>
