const rewire = require('rewire');

const apiSpecExportTools = rewire('../lib/apiSpecExportTools');

const testSpec = 'test';

const oneDeepSpec = {
  test: testSpec,
};

const twoDeepSpec = {
  test: oneDeepSpec,
};

const localSpec = './test';

const oneDeepLocal = {
  test: localSpec,
};

const twoDeepLocal = {
  test: oneDeepLocal,
};

describe('coreExternals', function() {
  // Note: all externals objects will have at least one entry for the Kolibri object itself.
  function expectLengthOfCoreExternals(apiSpec, length) {
    expect(Object.keys(apiSpecExportTools.coreExternals('test_global'))).toHaveLength(length);
  }
  describe('top level with special keys', function() {
    it('should have one entry', function() {
      apiSpecExportTools.__set__('apiSpec', {});
      expectLengthOfCoreExternals(apiSpecExportTools, 1);
    });
  });
  describe('1 nested valid spec for non-local module', function() {
    it('should have three entries', function() {
      apiSpecExportTools.__set__('apiSpec', oneDeepSpec);
      expectLengthOfCoreExternals(apiSpecExportTools, 3);
    });
  });
  describe('2 nested valid spec for non-local module', function() {
    it('should have three entries', function() {
      apiSpecExportTools.__set__('apiSpec', twoDeepSpec);
      expectLengthOfCoreExternals(apiSpecExportTools, 3);
    });
  });
  describe('1 nested valid spec for local module', function() {
    it('should have two entries', function() {
      apiSpecExportTools.__set__('apiSpec', oneDeepLocal);
      expectLengthOfCoreExternals(apiSpecExportTools, 2);
    });
  });
  describe('2 nested valid spec for local module', function() {
    it('should have two entries', function() {
      apiSpecExportTools.__set__('apiSpec', twoDeepLocal);
      expectLengthOfCoreExternals(apiSpecExportTools, 2);
    });
  });
});

describe('coreAliases', function() {
  const baseAliasesLength = Object.keys(apiSpecExportTools.baseAliases).length;
  function expectLengthCoreAliases(apiSpec, length) {
    expect(Object.keys(apiSpecExportTools.coreAliases())).toHaveLength(length);
  }

  describe('top level with special keys no local import', function() {
    it('should have no extra entries', function() {
      apiSpecExportTools.__set__('apiSpec', {});
      expectLengthCoreAliases(apiSpecExportTools, baseAliasesLength);
    });
  });
  describe('1 deep nested valid spec no local import', function() {
    it('should have 1 extra entry', function() {
      apiSpecExportTools.__set__('apiSpec', oneDeepSpec);
      expectLengthCoreAliases(apiSpecExportTools, baseAliasesLength + 1);
    });
  });
  describe('2 deep nested valid spec no local import', function() {
    it('should have 1 extra entry', function() {
      apiSpecExportTools.__set__('apiSpec', twoDeepSpec);
      expectLengthCoreAliases(apiSpecExportTools, baseAliasesLength + 1);
    });
  });
  describe('1 nested valid spec with local import', function() {
    it('should have 1 extra entry', function() {
      apiSpecExportTools.__set__('apiSpec', oneDeepLocal);
      expectLengthCoreAliases(apiSpecExportTools, baseAliasesLength + 1);
    });
    it('should have a path of kolibri.test', function() {
      apiSpecExportTools.__set__('apiSpec', oneDeepLocal);
      expect(Object.keys(apiSpecExportTools.coreAliases())).toContain('kolibri.test');
    });
  });
  describe('2 nested valid spec with local import', function() {
    it('should have 1 extra entry', function() {
      apiSpecExportTools.__set__('apiSpec', twoDeepLocal);
      expectLengthCoreAliases(apiSpecExportTools, baseAliasesLength + 1);
    });
    it('should have a path of kolibri.test.test', function() {
      apiSpecExportTools.__set__('apiSpec', twoDeepLocal);
      expect(Object.keys(apiSpecExportTools.coreAliases())).toContain('kolibri.test.test');
    });
  });
});
