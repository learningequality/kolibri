import { validateObject, objectWithDefaults } from '../objectSpecs';

const simpleSpec = {
  str1: {
    type: String,
    required: true,
  },
  str2: {
    type: String,
    default: 'hello',
  },
  str3: {
    type: String,
    default: null,
  },
  num: {
    type: Number,
    default: 12,
    validator(value) {
      return value > 10 && value < 20;
    },
  },
  nestedObject: {
    type: Object,
    default: null,
    spec: {
      someVal: {
        type: Number,
        required: true,
      },
      upperCaseString: {
        type: String,
        required: true,
        validator(val) {
          return val === val.toUpperCase();
        },
      },
    },
  },
  anotherObj: {
    type: Object,
    default() {
      return {
        prop_A: 'val_A',
        prop_B: 'val_B',
      };
    },
  },
  arrayOfNum: {
    type: Array,
    default: () => [],
    spec: {
      type: Number,
      required: true,
    },
  },
  arrayOfObj: {
    type: Array,
    default: () => [],
    spec: {
      type: Object,
      default: null,
      spec: {
        prop_C: { type: String, default: 'val_C' },
        prop_D: { type: String, default: 'val_D' },
      },
    },
  },
};

describe('validateObject basic operation', () => {
  test('validateObject should succeed with only required property', () => {
    const obj = {
      str1: 'A',
    };
    expect(validateObject(obj, simpleSpec)).toBe(true);
  });
  test('validateObject should succeed with optional properties', () => {
    const obj = {
      str1: 'A',
      str2: 'B',
    };
    expect(validateObject(obj, simpleSpec)).toBe(true);
  });
  test('validateObject should fail without required properties', () => {
    const obj = {
      str2: 'B',
    };
    expect(validateObject(obj, simpleSpec)).toBe(false);
  });
  test('validateObject should fail incorrect type', () => {
    const obj = {
      str1: 'A',
      num: '1',
    };
    expect(validateObject(obj, simpleSpec)).toBe(false);
  });
  test('validateObject should fail incorrect validation', () => {
    const obj = {
      str1: 'A',
      num: 1,
    };
    expect(validateObject(obj, simpleSpec)).toBe(false);
  });
  test('validateObject should succeed with correct validation', () => {
    const obj = {
      str1: 'A',
      num: 15,
    };
    expect(validateObject(obj, simpleSpec)).toBe(true);
  });
  test('validateObject should succeed with sub-spec validation', () => {
    const obj = {
      str1: 'A',
      nestedObject: {
        someVal: 3,
        upperCaseString: 'HELLO',
      },
    };
    expect(validateObject(obj, simpleSpec)).toBe(true);
  });
  test('validateObject should test all children of an Array that has a spec', () => {
    const obj = {
      str1: 'A',
      arrayOfNum: [1, 2, 3, 4, 5],
      arrayOfObj: [{ prop_C: 'val_C', prop_D: 'val_D' }],
    };
    expect(validateObject(obj, simpleSpec)).toBe(true);
  });
});

describe('validateObject rejects bad specs', () => {
  test('spec can not have both default and required', () => {
    const badSpec = {
      str1: {
        type: String,
        required: true,
        default: 'hello',
      },
    };
    const obj = {
      str1: 'A',
    };
    expect(validateObject(obj, badSpec)).toBe(false);
  });
  test('spec must have either default or required', () => {
    const badSpec = {
      str1: {
        type: String,
      },
    };
    const obj = {
      str1: 'A',
    };
    expect(validateObject(obj, badSpec)).toBe(false);
  });
  test('non-object/array cannot have sub-spec', () => {
    const badSpec = {
      str1: {
        type: String,
        default: 'hello',
        spec: {
          type: Boolean,
          default: false,
        },
      },
    };
    const obj = {
      str1: 'A',
    };
    expect(validateObject(obj, badSpec)).toBe(false);
  });
  test('Objects must use function for defaults', () => {
    const badSpec = {
      obj: {
        type: Object,
        default: {
          val_A: 'A',
        },
      },
    };
    const obj = {
      str1: 'A',
    };
    expect(validateObject(obj, badSpec)).toBe(false);
  });
  test('A specced array rejects an array even if any value is bad', () => {
    const badNumArrayObj = {
      arrayOfNum: [1, 2, 3, 4, 5, 'A'],
    };
    expect(validateObject(badNumArrayObj, simpleSpec)).toBe(false);
    const badObjArrayObj = {
      arrayOfObj: [{ foo: 'bar', prop_c: 'val_c' }],
    };
    expect(validateObject(badObjArrayObj, simpleSpec)).toBe(false);
  });
});

describe('objectWithDefaults fills defaults', () => {
  test('defaults are filled in as expected', () => {
    const obj = {
      str1: 'A',
    };
    expect(objectWithDefaults(obj, simpleSpec)).toMatchObject({
      str1: 'A',
      str2: 'hello',
      str3: null,
      num: 12,
      nestedObject: null,
      anotherObj: {
        prop_A: 'val_A',
        prop_B: 'val_B',
      },
    });
  });
  test('input takes precedence over defaults', () => {
    const obj = {
      str1: 'A',
      str2: 'B',
    };
    expect(objectWithDefaults(obj, simpleSpec)).toMatchObject({
      str1: 'A',
      str2: 'B',
      str3: null,
      num: 12,
      nestedObject: null,
      anotherObj: {
        prop_A: 'val_A',
        prop_B: 'val_B',
      },
    });
  });
});
