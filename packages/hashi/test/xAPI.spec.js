import { v4 } from 'uuid';
import {
  Agent,
  ActivityDefinition,
  Activity,
  Attachment,
  Context,
  Group,
  ObjectSchema,
  Result,
  Score,
  Statement,
  StatementRef,
  SubStatement,
  xAPIValidationError,
  Verb,
} from '../src/xAPI/xAPISchema';
import { SampleStatements, SampleObjects, SampleActivityDefinitions } from './xapidata';

const logging = console; // eslint-disable-line no-console

const mbox = 'mailto:test@test.com';
const openid = 'http://uri.arg.com';

describe('xAPI data validation', () => {
  describe('Actor validation', () => {
    it('should throw an error when more than one IFI is supplied', () => {
      expect(() => {
        Agent.clean({ mbox, openid });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when no IFI is supplied', () => {
      expect(() => {
        Agent.clean({});
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when mbox without prefixed mailto: is supplied', () => {
      expect(() => {
        Agent.clean({ mbox: 'test@test.com' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when mbox is prefixed but is an obviously invalid email', () => {
      expect(() => {
        Agent.clean({ mbox: 'mailto:testtest.com' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return mbox when mbox is valid', () => {
      expect(Agent.clean({ mbox })).toEqual({ mbox });
    });
    it('should throw an error when mbox_sha1sum is not a 40 digit hex', () => {
      expect(() => {
        Agent.clean({ mbox_sha1sum: 'test@test.com' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when mbox_sha1sum is not a string', () => {
      expect(() => {
        Agent.clean({ mbox_sha1sum: 1234 });
      }).toThrowError(xAPIValidationError);
    });
    it('should return mbox_sha1sum when mbox_sha1sum is valid', () => {
      const mbox_sha1sum = '6f9b9af3cd6e8b8a73c2cdced37fe9f59226e27d';
      expect(Agent.clean({ mbox_sha1sum })).toEqual({ mbox_sha1sum });
    });
    it('should throw an error when openid is not a string', () => {
      expect(() => {
        Agent.clean({ openid: 1234 });
      }).toThrowError(xAPIValidationError);
    });
    it('should return openid when openid is valid', () => {
      expect(Agent.clean({ openid })).toEqual({ openid });
    });
    it('should throw an error when account.homePage is not defined', () => {
      expect(() => {
        Agent.clean({ account: { name: 'valid' } });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when account.homePage is not a string', () => {
      expect(() => {
        Agent.clean({ account: { name: 'valid', homePage: [] } });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when account.name is not defined', () => {
      expect(() => {
        Agent.clean({ account: { homePage: 'valid' } });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when account.name is not a string', () => {
      expect(() => {
        Agent.clean({ account: { name: [], homePage: 'valid' } });
      }).toThrowError(xAPIValidationError);
    });
    it('should return account when account is valid', () => {
      const account = {
        name: 'valid',
        homePage: 'valid',
      };
      expect(Agent.clean({ account })).toEqual({ account });
    });
    it('should throw an error when objectType is not a string', () => {
      expect(() => {
        Agent.clean({ mbox, objectType: 1234 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when objectType is not Agent', () => {
      expect(() => {
        Agent.clean({ mbox, objectType: 'Secret' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return objectType when objectType is valid', () => {
      expect(Agent.clean({ mbox, objectType: 'Agent' })).toEqual({ mbox, objectType: 'Agent' });
    });
    it('should throw an error when name is not a string', () => {
      expect(() => {
        Agent.clean({ mbox, name: 1234 });
      }).toThrowError(xAPIValidationError);
    });
    it('should return name when name is valid', () => {
      expect(Agent.clean({ mbox, name: 'Name' })).toEqual({ mbox, name: 'Name' });
    });
  });
  describe('Group validation', () => {
    const objectType = 'Group';
    it('should throw an error when more than one IFI is supplied', () => {
      expect(() => {
        Group.clean({ objectType, mbox, openid });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when objectType is not Group', () => {
      expect(() => {
        Group.clean({ objectType: 'Agent', mbox });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when no IFI and no member is supplied', () => {
      expect(() => {
        Group.clean({ objectType });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when an invalid member is supplied', () => {
      expect(() => {
        Group.clean({ objectType, member: [{ mbox, openid }] });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when member is not an array', () => {
      expect(() => {
        Group.clean({ objectType, member: 'member' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when name is not a string', () => {
      expect(() => {
        Group.clean({ objectType, mbox, name: 1234 });
      }).toThrowError(xAPIValidationError);
    });
    it('should return name when name is valid', () => {
      expect(Group.clean({ objectType, mbox, name: 'Name' })).toEqual({
        objectType,
        mbox,
        name: 'Name',
      });
    });
  });
  describe('Verb validation', () => {
    const verb = {
      id: 'http://example.com/xapi/verbs#defenestrated',
      display: {
        'en-US': 'defenestrated',
        es: 'defenestrado',
      },
    };
    it('should throw an error no id is supplied', () => {
      expect(() => {
        Verb.clean({});
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when id is not a string', () => {
      expect(() => {
        Verb.clean({ id: 123 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when id is not an IRI', () => {
      expect(() => {
        Verb.clean({ id: '/resource' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when display is not an object', () => {
      expect(() => {
        Verb.clean({ id: '123', display: 'this' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return id when id is valid', () => {
      expect(Verb.clean({ id: 'http://test.org' })).toEqual({ id: 'http://test.org' });
    });
    it('should return valid verb', () => {
      expect(Verb.clean(verb)).toEqual(verb);
    });
  });
  describe('ActivityDefinition validation', () => {
    it('should throw an error when type is not a string', () => {
      expect(() => {
        ActivityDefinition.clean({ type: 123 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when type is not an IRI', () => {
      expect(() => {
        ActivityDefinition.clean({ type: '123' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when name is not an object', () => {
      expect(() => {
        ActivityDefinition.clean({ name: 'this' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when name is not a languageMap', () => {
      expect(() => {
        ActivityDefinition.clean({ name: { this: 'that' } });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when description is not an object', () => {
      expect(() => {
        ActivityDefinition.clean({ description: 'this' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when description is not a languageMap', () => {
      expect(() => {
        ActivityDefinition.clean({ description: { this: 'that' } });
      }).toThrowError(xAPIValidationError);
    });
    it('should return type when type is valid', () => {
      expect(ActivityDefinition.clean({ type: 'http://test.org' })).toEqual({
        type: 'http://test.org',
      });
    });
    it('should throw an error when type is CMI interaction and interactionType is not defined', () => {
      expect(() => {
        ActivityDefinition.clean({ type: 'http://adlnet.gov/expapi/activities/cmi.interaction' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return the object when type is CMI interaction and interactionType is defined', () => {
      const value = {
        type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
        interactionType: 'true-false',
      };
      expect(ActivityDefinition.clean(value)).toEqual(value);
    });
    describe('Interaction Activities validation', () => {
      let warnMock;
      beforeEach(() => {
        warnMock = jest.fn();
        logging.warn = warnMock;
      });
      const interactionOptions = ['choices', 'scale', 'source', 'target', 'steps'];
      describe('true-false interaction', () => {
        test.each(interactionOptions)('should throw an error if %s is specified', option => {
          expect(() => {
            ActivityDefinition.clean({ interactionType: 'true-false', [option]: [{ id: 'test' }] });
          }).toThrowError(xAPIValidationError);
        });
        test.each(['true', 'false'])(
          'should not throw an error if %s is a correct response',
          resp => {
            ActivityDefinition.clean({
              interactionType: 'true-false',
              correctResponsesPattern: [resp],
            });
            expect(warnMock).not.toHaveBeenCalled();
          },
        );
        test('should give a warning if middle is a correct response', () => {
          ActivityDefinition.clean({
            interactionType: 'true-false',
            correctResponsesPattern: ['middle'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
      });
      describe('choice interaction', () => {
        test.each(interactionOptions.filter(o => o !== 'choices'))(
          'should throw an error if %s is specified',
          option => {
            expect(() => {
              ActivityDefinition.clean({ interactionType: 'choice', [option]: [{ id: 'test' }] });
            }).toThrowError(xAPIValidationError);
          },
        );
        test('should give a warning if correct response is not in choices', () => {
          ActivityDefinition.clean({
            interactionType: 'choice',
            choices: [{ id: 'test' }],
            correctResponsesPattern: ['middle'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses is not in choices', () => {
          ActivityDefinition.clean({
            interactionType: 'choice',
            choices: [{ id: 'test' }],
            correctResponsesPattern: ['test', 'middle'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses in a list is not in choices', () => {
          ActivityDefinition.clean({
            interactionType: 'choice',
            choices: [{ id: 'test' }],
            correctResponsesPattern: ['test[,]middle', 'test'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
      });
      describe('sequencing interaction', () => {
        test.each(interactionOptions.filter(o => o !== 'choices'))(
          'should throw an error if %s is specified',
          option => {
            expect(() => {
              ActivityDefinition.clean({
                interactionType: 'sequencing',
                [option]: [{ id: 'test' }],
              });
            }).toThrowError(xAPIValidationError);
          },
        );
        test('should give a warning if correct response is not in choices', () => {
          ActivityDefinition.clean({
            interactionType: 'sequencing',
            choices: [{ id: 'test' }],
            correctResponsesPattern: ['middle'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses is not in choices', () => {
          ActivityDefinition.clean({
            interactionType: 'sequencing',
            choices: [{ id: 'test' }],
            correctResponsesPattern: ['test', 'middle'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses in a list is not in choices', () => {
          ActivityDefinition.clean({
            interactionType: 'sequencing',
            choices: [{ id: 'test' }],
            correctResponsesPattern: ['test[,]middle', 'test'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
      });
      describe('matching interaction', () => {
        test.each(interactionOptions.filter(o => o !== 'source' || o !== 'target'))(
          'should throw an error if %s is specified',
          option => {
            expect(() => {
              ActivityDefinition.clean({ interactionType: 'matching', [option]: [{ id: 'test' }] });
            }).toThrowError(xAPIValidationError);
          },
        );
        test('should give a warning if correct response is not in source', () => {
          ActivityDefinition.clean({
            interactionType: 'matching',
            source: [{ id: 'source' }],
            target: [{ id: 'target' }],
            correctResponsesPattern: ['middle[.]target'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses is not in source', () => {
          ActivityDefinition.clean({
            interactionType: 'matching',
            source: [{ id: 'source' }],
            target: [{ id: 'target' }],
            correctResponsesPattern: ['source[.]target', 'middle[.]target'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses in a list is not in source', () => {
          ActivityDefinition.clean({
            interactionType: 'matching',
            source: [{ id: 'source' }],
            target: [{ id: 'target' }],
            correctResponsesPattern: ['source[.]target[,]middle[.]target', 'source[.]target'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if correct response is not in target', () => {
          ActivityDefinition.clean({
            interactionType: 'matching',
            source: [{ id: 'source' }],
            target: [{ id: 'target' }],
            correctResponsesPattern: ['source[.]middle'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses is not in target', () => {
          ActivityDefinition.clean({
            interactionType: 'matching',
            source: [{ id: 'source' }],
            target: [{ id: 'target' }],
            correctResponsesPattern: ['source[.]target', 'source[.]middle'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses in a list is not in target', () => {
          ActivityDefinition.clean({
            interactionType: 'matching',
            source: [{ id: 'source' }],
            target: [{ id: 'target' }],
            correctResponsesPattern: ['source[.]target[,]source[.]middle', 'source[.]target'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
      });
      describe('performance interaction', () => {
        test.each(interactionOptions.filter(o => o !== 'steps'))(
          'should throw an error if %s is specified',
          option => {
            expect(() => {
              ActivityDefinition.clean({
                interactionType: 'performance',
                [option]: [{ id: 'test' }],
              });
            }).toThrowError(xAPIValidationError);
          },
        );
        test('should give a warning if correct response is not in steps', () => {
          ActivityDefinition.clean({
            interactionType: 'performance',
            steps: [{ id: 'test' }],
            correctResponsesPattern: ['middle[.]response'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should not give a warning if correct response is in steps', () => {
          ActivityDefinition.clean({
            interactionType: 'performance',
            steps: [{ id: 'test' }],
            correctResponsesPattern: ['test[.]response'],
          });
          expect(warnMock).not.toHaveBeenCalled();
        });
        // The spec says that the response can also be a numeric type, but as this is always
        // encoded as a string we cannot apply additional validation in this case
        test('should give a warning if one of the correct responses is not in steps', () => {
          ActivityDefinition.clean({
            interactionType: 'performance',
            steps: [{ id: 'test' }],
            correctResponsesPattern: ['test[.]response', 'invalid[.]response'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if one of the correct responses in a list is not in steps', () => {
          ActivityDefinition.clean({
            interactionType: 'performance',
            steps: [{ id: 'test' }],
            correctResponsesPattern: ['test[.]response[,]invalid[.]response', 'test[.]response'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
      });
      describe('likert interaction', () => {
        test.each(interactionOptions.filter(o => o !== 'scale'))(
          'should throw an error if %s is specified',
          option => {
            expect(() => {
              ActivityDefinition.clean({ interactionType: 'likert', [option]: [{ id: 'test' }] });
            }).toThrowError(xAPIValidationError);
          },
        );
        test('should give a warning if one of the correct responses is not in scale', () => {
          ActivityDefinition.clean({
            interactionType: 'likert',
            scale: [{ id: 'scale' }],
            correctResponsesPattern: ['test', 'scale'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should not give a warning the correct responses are in scale', () => {
          ActivityDefinition.clean({
            interactionType: 'likert',
            scale: [{ id: 'scale' }, { id: 'test' }],
            correctResponsesPattern: ['scale', 'test'],
          });
          expect(warnMock).not.toHaveBeenCalled();
        });
      });
      describe('fill-in interaction', () => {
        test.each(interactionOptions)('should throw an error if %s is specified', option => {
          expect(() => {
            ActivityDefinition.clean({ interactionType: 'fill-in', [option]: [{ id: 'test' }] });
          }).toThrowError(xAPIValidationError);
        });
      });
      describe('long-fill-in interaction', () => {
        test.each(interactionOptions)('should throw an error if %s is specified', option => {
          expect(() => {
            ActivityDefinition.clean({
              interactionType: 'long-fill-in',
              [option]: [{ id: 'test' }],
            });
          }).toThrowError(xAPIValidationError);
        });
      });
      describe('numeric interaction', () => {
        test.each(interactionOptions)('should throw an error if %s is specified', option => {
          expect(() => {
            ActivityDefinition.clean({ interactionType: 'numeric', [option]: [{ id: 'test' }] });
          }).toThrowError(xAPIValidationError);
        });
        test('should give a warning if correct response is not a valid number', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['invalid'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should not give a warning if correct response is a valid number', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['7'],
          });
          expect(warnMock).not.toHaveBeenCalled();
        });
        test('should give a warning if correct response is not a valid lower bounded range', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['invalid[:]'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should not give a warning if correct response is a valid lower bounded range', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['7[:]'],
          });
          expect(warnMock).not.toHaveBeenCalled();
        });
        test('should give a warning if correct response is not a valid upper bounded range', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['[:]invalid'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should not give a warning if correct response is a valid upper bounded range', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['[:]7'],
          });
          expect(warnMock).not.toHaveBeenCalled();
        });
        test('should give a warning if correct response is a bounded range with invalid lower bound', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['invalid[:]7'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if correct response is a bounded range with invalid upper bound', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['7[:]invalid'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if correct response is a bounded range with invalid bounds', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['invalid[:]invalid'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should give a warning if correct response is a bounded range with out of order bounds', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['7[:]4'],
          });
          expect(warnMock).toHaveBeenCalled();
        });
        test('should not give a warning if correct response is a bounded range with valid bounds', () => {
          ActivityDefinition.clean({
            interactionType: 'numeric',
            correctResponsesPattern: ['4[:]7'],
          });
          expect(warnMock).not.toHaveBeenCalled();
        });
      });
      describe('other interaction', () => {
        test.each(interactionOptions)('should throw an error if %s is specified', option => {
          expect(() => {
            ActivityDefinition.clean({ interactionType: 'other', [option]: [{ id: 'test' }] });
          }).toThrowError(xAPIValidationError);
        });
      });
    });
    it.each(SampleActivityDefinitions)('should return object %# when object is valid', obj => {
      expect(ActivityDefinition.clean(obj)).toEqual(obj);
    });
  });
  describe('Activity validation', () => {
    it('should throw an error when id is not a string', () => {
      expect(() => {
        Activity.clean({ id: 123 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when id is not an IRI', () => {
      expect(() => {
        Activity.clean({ id: '123' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when objectType is not a string', () => {
      expect(() => {
        Activity.clean({ objectType: null });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when objectType is not Activity', () => {
      expect(() => {
        Activity.clean({ objectType: 'this' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return id when id is valid', () => {
      expect(Activity.clean({ id: 'http://test.org' })).toEqual({ id: 'http://test.org' });
    });
  });
  describe('Statement Reference validation', () => {
    it('should throw an error when id is not a string', () => {
      expect(() => {
        StatementRef.clean({ id: 123 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when id is not a UUID', () => {
      expect(() => {
        StatementRef.clean({ id: '123' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when objectType is not a string', () => {
      expect(() => {
        StatementRef.clean({ objectType: null });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when objectType is not StatementRef', () => {
      expect(() => {
        StatementRef.clean({ objectType: 'this' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return id when id is valid and objectType is specified', () => {
      const id = v4();
      expect(StatementRef.clean({ id, objectType: 'StatementRef' })).toEqual({
        id,
        objectType: 'StatementRef',
      });
    });
  });
  describe('SubStatement validation', () => {
    const substmt = {
      objectType: 'SubStatement',
      actor: {
        objectType: 'Agent',
        mbox: 'mailto:test@example.com',
      },
      verb: {
        id: 'http://example.com/visited',
        display: {
          'en-US': 'will visit',
        },
      },
      object: {
        objectType: 'Activity',
        id: 'http://example.com/website',
        definition: {
          name: {
            'en-US': 'Some Awesome Website',
          },
        },
      },
    };
    it('should throw an error when id is defined', () => {
      expect(() => {
        SubStatement.clean({ id: v4(), ...substmt });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when version is defined', () => {
      expect(() => {
        SubStatement.clean({ version: '1.0.0', ...substmt });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when authority is defined', () => {
      expect(() => {
        SubStatement.clean({ authority: {}, ...substmt });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when stored is defined', () => {
      expect(() => {
        SubStatement.clean({ stored: '2020-11-10', ...substmt });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when objectType is not defined', () => {
      expect(() => {
        SubStatement.clean({ ...substmt, objectType: undefined });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when objectType is not StatementRef', () => {
      expect(() => {
        SubStatement.clean({ ...substmt, objectType: 'this' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return object when valid', () => {
      expect(SubStatement.clean(substmt)).toEqual(substmt);
    });
  });
  describe('Object validation', () => {
    it.each(SampleObjects)('it should return object %# when object is valid', obj => {
      const schema = ObjectSchema(obj);
      expect(schema.clean(obj)).toEqual(obj);
    });
  });
  describe('Score validation', () => {
    const score = {
      scaled: 0.5,
      raw: 15,
      min: 5,
      max: 25,
    };
    it('should throw an error when scaled is less than -1', () => {
      expect(() => {
        Score.clean({ ...score, scaled: -2 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when scaled is greater than 1', () => {
      expect(() => {
        Score.clean({ ...score, scaled: 2 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when min is greater than max', () => {
      expect(() => {
        Score.clean({ ...score, min: 26 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when raw is greater than max', () => {
      expect(() => {
        Score.clean({ ...score, raw: 26 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when raw is less than min', () => {
      expect(() => {
        Score.clean({ ...score, raw: 4 });
      }).toThrowError(xAPIValidationError);
    });
    it('should return object when valid', () => {
      expect(Score.clean(score)).toEqual(score);
    });
  });
  describe('Result validation', () => {
    const result = {
      score: {},
      success: true,
      completion: true,
      response: 'response',
      duration: 'P1Y2M4DT20H44M12.67S',
      extensions: {},
    };
    it('should throw an error when success is not Boolean', () => {
      expect(() => {
        Result.clean({ ...result, success: 0 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when completion is not Boolean', () => {
      expect(() => {
        Result.clean({ ...result, completion: 0 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when response is not a string', () => {
      expect(() => {
        Result.clean({ ...result, response: 0 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when duration is not an ISO 8601 duration', () => {
      expect(() => {
        Result.clean({ ...result, duration: 'hello' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when extensions is not an object', () => {
      expect(() => {
        Result.clean({ ...result, extensions: 'hello' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return object when valid', () => {
      expect(Result.clean(result)).toEqual(result);
    });
  });
  describe('Context validation', () => {
    const context = {
      registration: v4(),
      contextActivities: {
        parent: [
          {
            id: 'http://example.adlnet.gov/xapi/example/test1',
          },
        ],
        grouping: [
          {
            id: 'http://example.adlnet.gov/xapi/example/Algebra1',
          },
        ],
      },
      revision: 'second',
      platform: 'kolibri',
      language: 'fr-FR',
      extensions: {},
    };
    it('should throw an error when registration is not a UUID', () => {
      expect(() => {
        Context.clean({ ...context, registration: 0 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when revision is not a string', () => {
      expect(() => {
        Context.clean({ ...context, revision: 0 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when platform is not a string', () => {
      expect(() => {
        Context.clean({ ...context, platform: 0 });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when language is not a valid language code', () => {
      expect(() => {
        Context.clean({ ...context, language: 'testing_this-now' });
      }).toThrowError(xAPIValidationError);
    });
    it('should return object when valid', () => {
      expect(Context.clean(context)).toEqual(context);
    });
    it('should coerce contextActivities keys to arrays when valid', () => {
      expect(
        Context.clean({
          ...context,
          contextActivities: {
            parent: { id: 'http://example.adlnet.gov/xapi/example/test1' },
            grouping: { id: 'http://example.adlnet.gov/xapi/example/Algebra1' },
          },
        }),
      ).toEqual(context);
    });
  });
  describe('Attachment validation', () => {
    const SHA224 = 'd14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f';
    const SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const SHA384 =
      '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b';
    const SHA512 =
      'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e';
    const SHA512_224 = '6ed0dd02806fa89e25de060c19d3ac86cabb87d6a0ddd05c333b84f4';
    const SHA512_256 = 'c672b8d1ef56ed28ab87c3622c5114069bdd3ad7b8f9737498d0c01ecef0967a';
    const sha2s = [SHA224, SHA256, SHA384, SHA512, SHA512_224, SHA512_256];
    const attachment = {
      usageType: 'http://example.adlnet.gov/xapi/example/test1',
      display: {
        'fr-FR': 'la fiche',
      },
      description: {
        'fr-FR': 'la fiche des fiches!',
      },
      contentType: 'application/zip',
      length: 1234,
      sha2: SHA224,
      fileUrl: 'http://www.example.com/file.zip',
    };
    it('should throw an error when usageType is not an IRI', () => {
      expect(() => {
        Attachment.clean({ ...attachment, usageType: 'test' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when usageType is undefined', () => {
      expect(() => {
        Attachment.clean({ ...attachment, usageType: undefined });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when display is not a languageMap', () => {
      expect(() => {
        Attachment.clean({ ...attachment, display: { test: 'this' } });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when display is undefined', () => {
      expect(() => {
        Attachment.clean({ ...attachment, display: undefined });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when description is not a languageMap', () => {
      expect(() => {
        Attachment.clean({ ...attachment, description: { test: 'this' } });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when contentType is not a mimetype', () => {
      expect(() => {
        Attachment.clean({ ...attachment, contentType: 'notamimetype' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when contentType is undefined', () => {
      expect(() => {
        Attachment.clean({ ...attachment, contentType: undefined });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when length is not an integer', () => {
      expect(() => {
        Attachment.clean({ ...attachment, length: 'notaninteger' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when length is undefined', () => {
      expect(() => {
        Attachment.clean({ ...attachment, length: undefined });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when sha2 is not a SHA2 hex', () => {
      expect(() => {
        Attachment.clean({ ...attachment, sha2: 'aafafafafafafafafaf' });
      }).toThrowError(xAPIValidationError);
    });
    it('should throw an error when sha2 is undefined', () => {
      expect(() => {
        Attachment.clean({ ...attachment, sha2: undefined });
      }).toThrowError(xAPIValidationError);
    });
    it.each(sha2s)('should return object when valid sha2 %i is used', sha2 => {
      expect(Attachment.clean({ ...attachment, sha2 })).toEqual({ ...attachment, sha2 });
    });
    it('should return object when valid', () => {
      expect(Attachment.clean(attachment)).toEqual(attachment);
    });
  });
  describe('Statement validation', () => {
    it.each(SampleStatements)(
      'it should return statement %# when statement is valid',
      statement => {
        expect(Statement.clean({ version: '1.0.0', ...statement })).toEqual({
          version: '1.0.0',
          ...statement,
        });
      },
    );
    it('should add defaults to the statement', () => {
      const statement = {
        actor: {
          mbox: 'mailto:xapi@adlnet.gov',
        },
        verb: {
          id: 'http://adlnet.gov/expapi/verbs/created',
          display: {
            'en-US': 'created',
          },
        },
        object: {
          id: 'http://example.adlnet.gov/xapi/example/activity',
        },
      };
      const output = Statement.clean(statement);
      expect(output.id).not.toBeUndefined();
      expect(output.version).toEqual('1.0.0');
    });
  });
});
