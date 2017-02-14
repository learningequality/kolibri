
var path = require('path');
var fs = require('fs');

var assert = require('assert');

var stripJsonComments = require('strip-json-comments');
var HTMLHint = require('htmlhint').HTMLHint;


// add base rules
function getConfig() {
  var configPath = path.join(__dirname, '..', '..', '.htmlhintrc');
  if (fs.existsSync(configPath)) {
    var config = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(stripJsonComments(config));
  }
}
var ruleset = getConfig();

// add custom rules
require('../src/htmlhint_custom');

//rule is currently disabled
/*
describe('--attr-value-single-quotes', function() {
  describe('input is valid', function() {
    it('should have no errors', function (done) {
      var input = '<html class='test'></html>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 0);
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --attr-value-single-quotes', function (done) {
      var input = '<html class='test'></html>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--attr-value-single-quotes');
      done();
    });
  });
});
*/

describe('--no-self-close-common-html5-tags', function() {
  describe('input is valid', function() {
    it('should have no errors', function (done) {
      var input = '<div></div>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 0);
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --no-self-close-common-html5-tags', function (done) {
      var input = '<div />';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--no-self-close-common-html5-tags');
      done();
    });
  });
});


describe('--vue-component-conventions', function() {
  describe('input is valid', function() {
    it('should have no errors', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 0);
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang=\'stylus\' scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1);
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\nhtml\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '\n<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n   scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>  </script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is valid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script></script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 0);
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n  html\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function (done) {
      var input = '<template>\n\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      var output = HTMLHint.verify(input, ruleset);
      assert(output.length === 1 && output[0].rule.id === '--vue-component-conventions');
      done();
    });
  });
});
