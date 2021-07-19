/*
 * Sample data copied from: https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md#Appendix2A
 * 'stored' property is removed from the ExampleStatements
 */

export const SampleStatements = [
  {
    id: 'fd41c918-b88b-4b20-a0a5-a4c32391aaa0',
    timestamp: '2015-11-18T12:17:00+00:00',
    actor: {
      objectType: 'Agent',
      name: 'Project Tin Can API',
      mbox: 'mailto:user@example.com',
    },
    verb: {
      id: 'http://example.com/xapi/verbs#sent-a-statement',
      display: {
        'en-US': 'sent',
      },
    },
    object: {
      id: 'http://example.com/xapi/activity/simplestatement',
      definition: {
        name: {
          'en-US': 'simple statement',
        },
        description: {
          'en-US':
            'A simple Experience API statement. Note that the LRS does not need to have any prior information about the Actor (learner), the verb, or the Activity/object.',
        },
      },
    },
  },
  {
    id: '7ccd3322-e1a5-411a-a67d-6a735c76f119',
    timestamp: '2015-12-18T12:17:00+00:00',
    actor: {
      objectType: 'Agent',
      name: 'Example Learner',
      mbox: 'mailto:example.learner@adlnet.gov',
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/attempted',
      display: {
        'en-US': 'attempted',
      },
    },
    object: {
      id: 'http://example.adlnet.gov/xapi/example/simpleCBT',
      definition: {
        name: {
          'en-US': 'simple CBT course',
        },
        description: {
          'en-US': 'A fictitious example CBT course.',
        },
      },
    },
    result: {
      score: {
        scaled: 0.95,
      },
      success: true,
      completion: true,
      duration: 'PT1234S',
    },
  },
  {
    id: '6690e6c9-3ef0-4ed3-8b37-7f3964730bee',
    actor: {
      name: 'Team PB',
      mbox: 'mailto:teampb@example.com',
      member: [
        {
          name: 'Andrew Downes',
          account: {
            homePage: 'http://www.example.com',
            name: '13936749',
          },
          objectType: 'Agent',
        },
        {
          name: 'Toby Nichols',
          openid: 'http://toby.openid.example.org/',
          objectType: 'Agent',
        },
        {
          name: 'Ena Hills',
          mbox_sha1sum: 'ebd31e95054c018b10727ccffd2ef2ec3a016ee9',
          objectType: 'Agent',
        },
      ],
      objectType: 'Group',
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/attended',
      display: {
        'en-GB': 'attended',
        'en-US': 'attended',
      },
    },
    result: {
      extensions: {
        'http://example.com/profiles/meetings/resultextensions/minuteslocation':
          'X:\\meetings\\minutes\\examplemeeting.one',
      },
      success: true,
      completion: true,
      response: 'We agreed on some example actions.',
      duration: 'PT1H0M0S',
    },
    context: {
      registration: 'ec531277-b57b-4c15-8d91-d292c5b2b8f7',
      contextActivities: {
        parent: [
          {
            id: 'http://www.example.com/meetings/series/267',
            objectType: 'Activity',
          },
        ],
        category: [
          {
            id: 'http://www.example.com/meetings/categories/teammeeting',
            objectType: 'Activity',
            definition: {
              name: {
                en: 'team meeting',
              },
              description: {
                en: 'A category of meeting used for regular team meetings.',
              },
              type: 'http://example.com/expapi/activities/meetingcategory',
            },
          },
        ],
        other: [
          {
            id: 'http://www.example.com/meetings/occurances/34257',
            objectType: 'Activity',
          },
          {
            id: 'http://www.example.com/meetings/occurances/3425567',
            objectType: 'Activity',
          },
        ],
      },
      instructor: {
        name: 'Andrew Downes',
        account: {
          homePage: 'http://www.example.com',
          name: '13936749',
        },
        objectType: 'Agent',
      },
      team: {
        name: 'Team PB',
        mbox: 'mailto:teampb@example.com',
        objectType: 'Group',
      },
      platform: 'Example virtual meeting software',
      language: 'tlh',
      statement: {
        objectType: 'StatementRef',
        id: '6690e6c9-3ef0-4ed3-8b37-7f3964730bee',
      },
    },
    timestamp: '2013-05-18T05:32:34.804+00:00',
    authority: {
      account: {
        homePage: 'http://cloud.scorm.com/',
        name: 'anonymous',
      },
      objectType: 'Agent',
    },
    version: '1.0.0',
    object: {
      id: 'http://www.example.com/meetings/occurances/34534',
      definition: {
        extensions: {
          'http://example.com/profiles/meetings/activitydefinitionextensions/room': {
            name: 'Kilby',
            id: 'http://example.com/rooms/342',
          },
        },
        name: {
          'en-GB': 'example meeting',
          'en-US': 'example meeting',
        },
        description: {
          'en-GB':
            'An example meeting that happened on a specific occasion with certain people present.',
          'en-US':
            'An example meeting that happened on a specific occasion with certain people present.',
        },
        type: 'http://adlnet.gov/expapi/activities/meeting',
        moreInfo: 'http://virtualmeeting.example.com/345256',
      },
      objectType: 'Activity',
    },
  },
];

export const SampleObjects = [
  {
    id: 'http://www.example.co.uk/exampleactivity',
    definition: {
      name: {
        'en-GB': 'example activity',
        'en-US': 'example activity',
      },
      description: {
        'en-GB': 'An example of an activity',
        'en-US': 'An example of an activity',
      },
      type: 'http://www.example.co.uk/types/exampleactivitytype',
    },
    objectType: 'Activity',
  },
  {
    name: 'Andrew Downes',
    mbox: 'mailto:andrew@example.co.uk',
    objectType: 'Agent',
  },
  {
    name: 'Example Group',
    account: {
      homePage: 'http://example.com/homePage',
      name: 'GroupAccount',
    },
    objectType: 'Group',
    member: [
      {
        name: 'Andrew Downes',
        mbox: 'mailto:andrew@example.com',
        objectType: 'Agent',
      },
      {
        name: 'Aaron Silvers',
        openid: 'http://aaron.openid.example.org',
        objectType: 'Agent',
      },
    ],
  },
  {
    objectType: 'SubStatement',
    actor: {
      objectType: 'Agent',
      mbox: 'mailto:agent@example.com',
    },
    verb: {
      id: 'http://example.com/confirmed',
      display: {
        en: 'confirmed',
      },
    },
    object: {
      objectType: 'StatementRef',
      id: '9e13cefd-53d3-4eac-b5ed-2cf6693903bb',
    },
  },
];

export const SampleActivityDefinitions = [
  {
    description: {
      'en-US': 'Does the xAPI include the concept of statements?',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'true-false',
    correctResponsesPattern: ['true'],
  },
  {
    description: {
      'en-US': 'Which of these prototypes are available at the beta site?',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'choice',
    correctResponsesPattern: ['golf[,]tetris'],
    choices: [
      {
        id: 'golf',
        description: {
          'en-US': 'Golf Example',
        },
      },
      {
        id: 'facebook',
        description: {
          'en-US': 'Facebook App',
        },
      },
      {
        id: 'tetris',
        description: {
          'en-US': 'Tetris Example',
        },
      },
      {
        id: 'scrabble',
        description: {
          'en-US': 'Scrabble Example',
        },
      },
    ],
  },
  {
    description: {
      'en-US': 'Ben is often heard saying: ',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'fill-in',
    correctResponsesPattern: ["Bob's your uncle"],
  },
  {
    description: {
      'en-US': 'What is the purpose of the xAPI?',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'long-fill-in',
    correctResponsesPattern: [
      '{case_matters=false}{lang=en}To store and provide access to learning experiences.',
    ],
  },
  {
    description: {
      'en-US': 'How awesome is Experience API?',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'likert',
    correctResponsesPattern: ['likert_3'],
    scale: [
      {
        id: 'likert_0',
        description: {
          'en-US': "It's OK",
        },
      },
      {
        id: 'likert_1',
        description: {
          'en-US': "It's Pretty Cool",
        },
      },
      {
        id: 'likert_2',
        description: {
          'en-US': "It's Damn Cool",
        },
      },
      {
        id: 'likert_3',
        description: {
          'en-US': "It's Gonna Change the World",
        },
      },
    ],
  },
  {
    description: {
      'en-US': 'Match these people to their kickball team:',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'matching',
    correctResponsesPattern: ['ben[.]3[,]chris[.]2[,]troy[.]4[,]freddie[.]1'],
    source: [
      {
        id: 'ben',
        description: {
          'en-US': 'Ben',
        },
      },
      {
        id: 'chris',
        description: {
          'en-US': 'Chris',
        },
      },
      {
        id: 'troy',
        description: {
          'en-US': 'Troy',
        },
      },
      {
        id: 'freddie',
        description: {
          'en-US': 'Freddie',
        },
      },
    ],
    target: [
      {
        id: '1',
        description: {
          'en-US': 'Swift Kick in the Grass',
        },
      },
      {
        id: '2',
        description: {
          'en-US': 'We got Runs',
        },
      },
      {
        id: '3',
        description: {
          'en-US': 'Duck',
        },
      },
      {
        id: '4',
        description: {
          'en-US': 'Van Delay Industries',
        },
      },
    ],
  },
  {
    description: {
      'en-US': 'This interaction measures performance over a day of RS sports:',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'performance',
    correctResponsesPattern: ['pong[.]1:[,]dg[.]:10[,]lunch[.]'],
    steps: [
      {
        id: 'pong',
        description: {
          'en-US': 'Net pong matches won',
        },
      },
      {
        id: 'dg',
        description: {
          'en-US': 'Strokes over par in disc golf at Liberty',
        },
      },
      {
        id: 'lunch',
        description: {
          'en-US': 'Lunch having been eaten',
        },
      },
    ],
  },
  {
    description: {
      'en-US': 'Order players by their pong ladder position:',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'sequencing',
    correctResponsesPattern: ['tim[,]mike[,]ells[,]ben'],
    choices: [
      {
        id: 'tim',
        description: {
          'en-US': 'Tim',
        },
      },
      {
        id: 'ben',
        description: {
          'en-US': 'Ben',
        },
      },
      {
        id: 'ells',
        description: {
          'en-US': 'Ells',
        },
      },
      {
        id: 'mike',
        description: {
          'en-US': 'Mike',
        },
      },
    ],
  },
  {
    description: {
      'en-US': 'How many jokes is Chris the butt of each day?',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'numeric',
    correctResponsesPattern: ['4[:]'],
  },
  {
    description: {
      'en-US': 'On this map, please mark Franklin, TN',
    },
    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
    interactionType: 'other',
    correctResponsesPattern: ['(35.937432,-86.868896)'],
  },
];
