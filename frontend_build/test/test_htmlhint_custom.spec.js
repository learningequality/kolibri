const path = require('path');
const fs = require('fs');
const HTMLHint = require('htmlhint').HTMLHint;

// add base rules
function getConfig() {
  const configPath = path.join(__dirname, '..', '..', '.htmlhintrc.js');
  if (fs.existsSync(configPath)) {
    const config = require(configPath);
    return config;
  }
}
const ruleset = getConfig();

// add custom rules
require('../src/htmlhint_custom');

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

describe('--no-self-close-common-html5-tags', function() {
  describe('input is valid', function() {
    it('should have no errors', function() {
      const input = '<div></div>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(0);
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --no-self-close-common-html5-tags', function() {
      const input = '<div />';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--no-self-close-common-html5-tags');
    });
  });
});

describe('--vue-component-conventions', function() {
  describe('input is valid', function() {
    it('should have no errors', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(0);
    });
  });
  describe('input is invalid', function() {
    it('should have one error', function() {
      const input =
        "<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang='stylus' scoped>\n\n  styles\n\n</style>";
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\nhtml\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '\n<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n   scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
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
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n  html\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
  describe('input is invalid', function() {
    it('should have one error with rule id: --vue-component-conventions', function() {
      const input =
        '<template>\n\n\n  html\n\n</template>\n\n\n<script>\n\n  scripts\n\n</script>\n\n\n<style lang="stylus" scoped>\n\n  styles\n\n</style>';
      const output = HTMLHint.verify(input, ruleset);
      expect(output).toHaveLength(1);
      expectRuleName(output, '--vue-component-conventions');
    });
  });
});
