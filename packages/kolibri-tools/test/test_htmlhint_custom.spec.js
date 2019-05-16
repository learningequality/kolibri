const path = require('path');
const fs = require('fs');
const HTMLHint = require('htmlhint').HTMLHint;

// add base rules
function getConfig() {
  const configPath = path.join(__dirname, '..', '.htmlhintrc.js');
  if (fs.existsSync(configPath)) {
    const config = require(configPath);
    return config;
  }
}
const ruleset = getConfig();

// add custom rules
require('../lib/htmlhint_custom');

//rule is currently disabled
/*
describe('--attr-value-single-quotes', function() {
  describe('input is valid', function() {
    it('should have no errors', function (done) {
      const input = '<html class='test'></html>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(0);
      done();
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --attr-value-single-quotes', function (done) {
      const input = '<html class='test'></html>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1 &&
      expectRuleName(output, '--attr-value-single-quotes');
      done();
    });
  });
});
*/

function expectRuleName(output, ruleName) {
  expect(output[0].rule.id).toEqual(ruleName);
}

describe('--vue-component-conventions', function() {
  describe('input is valid', function() {
    it('should have no errors', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(0);
    });
  });
  // single quotes in lang attr
  describe('input is invalid', function() {
    it('should have one error', function() {
      const input =
        "<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang='stylus' scoped>\n\n  styles\n\n</style>";
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
    });
  });
  // first block isn't on the first line
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '\n<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  // missing space between template and script block
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  // extra space between script and style block
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  // script block with whitespace characters only
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  // script block with whitespace characters only
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>  </script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is valid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script></script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(0);
    });
  });
  describe('defer unpaired tags', function() {
    it('should not check for, or fail on, unpaired tags', function() {
      const input =
        '<template>\n\n  </div>\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, 'tag-pair');
    });
  });
});
