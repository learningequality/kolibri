/*!
 * ActivePresenter HTML5 Output File
 * Copyright (c) Atomi Systems, Inc. All rights reserved.
 * https://atomisystems.com/activepresenter/
 * Version: 8.5.0
 * Date: 2021.06.02
 */
(function(AP) {
    var $, jQuery;
    $ = jQuery = AP.$;
    var d = {
            l: [[1280, 720]],
            params: {
                PlayerFontSize: [13, 13, 13, 13],
                ContentCategory: [0, 0, 0, 0],
                ButtonBGColorHover: [
                    "rgb(126, 128, 133)",
                    "rgb(126, 128, 133)",
                    "rgb(126, 128, 133)",
                    "rgb(126, 128, 133)"
                ],
                Navigation: [2, 2, 2, 1],
                ContentBorderWidth: [15, 15, 15, 15],
                ContentBG: [
                    "rgb(233, 233, 234)",
                    "rgb(233, 233, 234)",
                    "rgb(233, 233, 234)",
                    "rgb(233, 233, 234)"
                ],
                AutoScroll: [true, true, true, true],
                PageBG: [
                    "rgb(233, 233, 234)",
                    "rgb(233, 233, 234)",
                    "rgb(233, 233, 234)",
                    "rgb(233, 233, 234)"
                ],
                PlayerFontFamily: ["Tahoma", "Tahoma", "Tahoma", "Tahoma"],
                ToolbarTextColor: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ],
                ShowLastBtn: [false, false, false, false],
                DisplayMode: [1, 1, 1, 1],
                TocBackground: [
                    "rgb(83, 86, 92)",
                    "rgb(83, 86, 92)",
                    "rgb(83, 86, 92)",
                    "rgb(83, 86, 92)"
                ],
                PlayerSize: [0, 0, 0, 0],
                AutoHidePlayerBar: [false, false, false, false],
                SideBarCategory: [0, 0, 0, 0],
                ButtonIconColor: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ],
                SideBarPos: [0, 0, 0, 0],
                SideBarWidth: [350, 350, 350, 350],
                ShowSpeedBtn: [true, true, true, true],
                TocItemBG: [
                    "rgb(104, 107, 112)",
                    "rgb(104, 107, 112)",
                    "rgb(104, 107, 112)",
                    "rgb(104, 107, 112)"
                ],
                ShowAuthorInfo: [false, false, false, false],
                ShowAuthorImage: [false, false, false, false],
                ShowAuthorVideo: [false, false, false, false],
                SidebarBG: [
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)"
                ],
                SidebarTextColor: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ],
                TopBarCategory: [0, 0, 0, 0],
                ShowTopBar: [false, false, false, false],
                ShowPlayBtn: [true, true, true, true],
                ShowSidebarBtn: [true, true, true, true],
                TocCategory: [0, 0, 0, 0],
                TocStyle: [0, 0, 0, 0],
                ToolbarCategory: [0, 0, 0, 0],
                TocItemBGCurrentHover: [
                    "rgb(204, 0, 0)",
                    "rgb(204, 0, 0)",
                    "rgb(204, 0, 0)",
                    "rgb(204, 0, 0)"
                ],
                TocShowDuration: [false, false, false, false],
                TocShowThumbnails: [true, true, true, true],
                ShowFirstBtn: [false, false, false, false],
                TocShowStateIcons: [false, false, false, false],
                TocItemBGCompletedHover: [
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)"
                ],
                ShowMaxTocLevel: [true, true, true, true],
                TOCTextColor: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ],
                ButtonIconColorActive: [
                    "rgb(229, 229, 229)",
                    "rgb(229, 229, 229)",
                    "rgb(229, 229, 229)",
                    "rgb(229, 229, 229)"
                ],
                TocItemBGHover: [
                    "rgb(126, 128, 133)",
                    "rgb(126, 128, 133)",
                    "rgb(126, 128, 133)",
                    "rgb(126, 128, 133)"
                ],
                TocItemBGCurrent: [
                    "rgb(178, 0, 0)",
                    "rgb(178, 0, 0)",
                    "rgb(178, 0, 0)",
                    "rgb(178, 0, 0)"
                ],
                TocItemBGCompleted: [
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)"
                ],
                ShowDisplayModeBtn: [true, true, true, true],
                Separator: [
                    "rgb(83, 86, 92)",
                    "rgb(83, 86, 92)",
                    "rgb(83, 86, 92)",
                    "rgb(83, 86, 92)"
                ],
                ShowToolbar: [false, false, false, false],
                SliderCategory: [0, 0, 0, 0],
                ShowRestartBtn: [true, true, true, true],
                ShowExitBtn: [false, false, false, false],
                ShowPrevBtn: [true, true, true, true],
                ShowProgressBar: [true, true, true, true],
                ShowNextBtn: [true, true, true, true],
                ShowVolumeBar: [true, true, true, true],
                ShowVolumeBtn: [true, true, true, true],
                ShowCCBtn: [true, true, true, true],
                ShowInfoBtn: [false, false, false, false],
                ShowTocBtn: [false, false, false, false],
                ShowResourcesBtn: [true, true, true, true],
                ShowSegments: [true, true, true, true],
                ShowPosition: [true, true, true, true],
                ShowPrezLen: [true, true, true, true],
                ToolbarBG: [
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)"
                ],
                ButtonCategory: [0, 0, 0, 0],
                ButtonIconColorHover: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ],
                ButtonBGColor: [
                    "rgb(104, 107, 112)",
                    "rgb(104, 107, 112)",
                    "rgb(104, 107, 112)",
                    "rgb(104, 107, 112)"
                ],
                ButtonBGColorActive: [
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)"
                ],
                ButtonBorderColor: [
                    "rgb(32, 35, 41)",
                    "rgb(32, 35, 41)",
                    "rgb(32, 35, 41)",
                    "rgb(32, 35, 41)"
                ],
                SliderThumbBG: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ],
                SliderThumbBGHover: [
                    "rgb(229, 229, 229)",
                    "rgb(229, 229, 229)",
                    "rgb(229, 229, 229)",
                    "rgb(229, 229, 229)"
                ],
                SliderTrackBG1: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ],
                SliderTrackBG2: [
                    "rgb(255, 0, 0)",
                    "rgb(255, 0, 0)",
                    "rgb(255, 0, 0)",
                    "rgb(255, 0, 0)"
                ],
                SliderMarkers: [
                    "rgb(255, 127, 0)",
                    "rgb(255, 127, 0)",
                    "rgb(255, 127, 0)",
                    "rgb(255, 127, 0)"
                ],
                MenuCategory: [0, 0, 0, 0],
                MenuBackground: [
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)"
                ],
                MenuItemBGHover: [
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)",
                    "rgb(61, 65, 72)"
                ],
                MenuTextColor: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ],
                MenuBorderColor: [
                    "rgb(32, 35, 41)",
                    "rgb(32, 35, 41)",
                    "rgb(32, 35, 41)",
                    "rgb(32, 35, 41)"
                ],
                ResourcesPaneCategory: [0, 0, 0, 0],
                ResourcesPaneBackground: [
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)",
                    "rgb(40, 44, 52)"
                ],
                ResourcesPaneTextColor: [
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)",
                    "rgb(255, 255, 255)"
                ]
            },
            homepage: "",
            projectName: "ORCoast",
            e: { l: [[16, [[14, -1, 0]]]] },
            copyright: "",
            appHomepage: "https://atomisystems.com",
            author: "Gordon",
            generator: "ActivePresenter",
            pools: [],
            authorDescription: "",
            description: "",
            language: "en-US",
            feedbacks: [
                {
                    at: "Correct Feedback",
                    i: 11,
                    de: "",
                    a: true,
                    fbi: "300_1",
                    n: "Correct Feedback",
                    m: 15,
                    w: 1,
                    b: { f: [1, 3036676095] },
                    d: 3000,
                    h: [720],
                    ts: [2, 700],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [1, [[200, 0, 0]]],
                                [3, [[200, 0, 0]]],
                                [2, [[200, 0, 0]]],
                                [8, [[200, 0, 0]]],
                                [9, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 8,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Shape_4",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [430, 243, 420, 235] }],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    s: [10, 45, 2, 1509949440],
                                    f: [1, 4294835709],
                                    l: [1, 4287535269, 321],
                                    a: [1, [100]]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 9,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_5",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    l: [1, 2528426691, 321],
                                    w: [
                                        {
                                            r: [440, 308, 400, 1],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null,
                                    a: [565]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_1",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 249, 400, 55] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCorrect</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:28px;color:#8DB936;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 3,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Text_3",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 324, 400, 84] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCongratulations, your answer is correct.</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#44546A;text-align:center;",
                                        "default"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 2,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_2",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35675136,
                            e: { l: [[3, [[7, 1, 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        }
                    ],
                    e: null
                },
                {
                    at: "Incorrect Feedback",
                    i: 12,
                    de: "",
                    a: true,
                    fbi: "300_2",
                    n: "Incorrect Feedback",
                    m: 15,
                    w: 1,
                    b: { f: [1, 3036676095] },
                    d: 3000,
                    h: [720],
                    ts: [2, 700],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [1, [[200, 0, 0]]],
                                [3, [[200, 0, 0]]],
                                [2, [[200, 0, 0]]],
                                [8, [[200, 0, 0]]],
                                [9, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 8,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Shape_4",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [430, 243, 420, 235] }],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    s: [10, 45, 2, 1509949440],
                                    f: [1, 4294835709],
                                    l: [1, 4287535269, 321],
                                    a: [1, [100]]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 9,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_5",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    l: [1, 2528426691, 321],
                                    w: [
                                        {
                                            r: [440, 308, 400, 1],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null,
                                    a: [565]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_1",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 249, 400, 55] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nIncorrect</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:28px;color:#EF8031;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 3,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Text_3",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 324, 400, 84] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSorry, your answer is not correct.</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#44546A;text-align:center;",
                                        "default"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 2,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_2",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35675136,
                            e: { l: [[3, [[7, 1, 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        }
                    ],
                    e: null
                },
                {
                    at: "Try Again Feedback",
                    i: 13,
                    de: "",
                    a: true,
                    fbi: "300_3",
                    n: "Try Again Feedback",
                    m: 15,
                    w: 1,
                    b: { f: [1, 3036676095] },
                    d: 3000,
                    h: [720],
                    ts: [2, 700],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [1, [[200, 0, 0]]],
                                [3, [[200, 0, 0]]],
                                [2, [[200, 0, 0]]],
                                [8, [[200, 0, 0]]],
                                [9, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 8,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Shape_4",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [430, 243, 420, 235] }],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    s: [10, 45, 2, 1509949440],
                                    f: [1, 4294835709],
                                    l: [1, 4287535269, 321],
                                    a: [1, [100]]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 9,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_5",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    l: [1, 2528426691, 321],
                                    w: [
                                        {
                                            r: [440, 308, 400, 1],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null,
                                    a: [565]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_1",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 249, 400, 55] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nIncorrect</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:28px;color:#EF8031;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 3,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Text_3",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 324, 400, 84] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSorry, your answer is not correct.</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#44546A;text-align:center;",
                                        "default"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 2,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_2",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTry Again</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTry Again</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTry Again</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTry Again</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35675136,
                            e: { l: [[3, [[39, "300_3", 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        }
                    ],
                    e: null
                },
                {
                    at: "Complete Feedback",
                    i: 14,
                    de: "",
                    a: true,
                    fbi: "300_4",
                    n: "Complete Feedback",
                    m: 15,
                    w: 1,
                    b: { f: [1, 3036676095] },
                    d: 3000,
                    h: [720],
                    ts: [2, 700],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [1, [[200, 0, 0]]],
                                [3, [[200, 0, 0]]],
                                [2, [[200, 0, 0]]],
                                [8, [[200, 0, 0]]],
                                [9, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 8,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Shape_4",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [430, 243, 420, 235] }],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    s: [10, 45, 2, 1509949440],
                                    f: [1, 4294835709],
                                    l: [1, 4287535269, 321],
                                    a: [1, [100]]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 9,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_5",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    l: [1, 2528426691, 321],
                                    w: [
                                        {
                                            r: [440, 308, 400, 1],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null,
                                    a: [565]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_1",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 249, 400, 55] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nComplete</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:28px;color:#8DB936;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 3,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Text_3",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 324, 400, 84] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nThank you for your answer.</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#44546A;text-align:center;",
                                        "default"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 2,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_2",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35675136,
                            e: { l: [[3, [[7, 1, 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        }
                    ],
                    e: null
                },
                {
                    at: "Incomplete Feedback",
                    i: 15,
                    de: "",
                    a: true,
                    fbi: "300_5",
                    n: "Incomplete Feedback",
                    m: 15,
                    w: 1,
                    b: { f: [1, 3036676095] },
                    d: 3000,
                    h: [720],
                    ts: [2, 700],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [1, [[200, 0, 0]]],
                                [3, [[200, 0, 0]]],
                                [2, [[200, 0, 0]]],
                                [8, [[200, 0, 0]]],
                                [9, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 8,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Shape_4",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [430, 243, 420, 235] }],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    s: [10, 45, 2, 1509949440],
                                    f: [1, 4294835709],
                                    l: [1, 4287535269, 321],
                                    a: [1, [100]]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 9,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_5",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    l: [1, 2528426691, 321],
                                    w: [
                                        {
                                            r: [440, 308, 400, 1],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null,
                                    a: [565]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_1",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 249, 400, 55] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nIncomplete</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:28px;color:#FAA957;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 3,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Text_3",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 324, 400, 84] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSorry, you must answer before continuing.</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#44546A;text-align:center;",
                                        "default"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 2,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_2",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35675136,
                            e: { l: [[3, [[39, "300_5", 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        }
                    ],
                    e: null
                },
                {
                    at: "Timeout Feedback",
                    i: 16,
                    de: "",
                    a: true,
                    fbi: "300_6",
                    n: "Timeout Feedback",
                    m: 15,
                    w: 1,
                    b: { f: [1, 3036676095] },
                    d: 3000,
                    h: [720],
                    ts: [2, 700],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [1, [[200, 0, 0]]],
                                [3, [[200, 0, 0]]],
                                [2, [[200, 0, 0]]],
                                [8, [[200, 0, 0]]],
                                [9, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 8,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Shape_4",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [430, 243, 420, 235] }],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    s: [10, 45, 2, 1509949440],
                                    f: [1, 4294835709],
                                    l: [1, 4287535269, 321],
                                    a: [1, [100]]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 9,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_5",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    l: [1, 2528426691, 321],
                                    w: [
                                        {
                                            r: [440, 308, 400, 1],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        0,
                                                        -40000,
                                                        0,
                                                        133333,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        400000,
                                                        0,
                                                        266667,
                                                        0,
                                                        440000,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:18px;color:#000000;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null,
                                    a: [565]
                                }
                            ],
                            f: 35651584,
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_1",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 249, 400, 55] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTimeout</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:28px;color:#EC1E79;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 3,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Text_3",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [440, 324, 400, 84] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSorry, the time to answer has expired.</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#44546A;text-align:center;",
                                        "default"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 2,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_2",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [577, 417, 126, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nContinue</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35675136,
                            e: { l: [[3, [[7, 1, 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        }
                    ],
                    e: null
                },
                {
                    at: "Review Feedback",
                    i: 17,
                    de: "",
                    a: true,
                    fbi: "300_7",
                    n: "Review Feedback",
                    m: 15,
                    w: 1,
                    b: { f: null },
                    d: 3000,
                    h: [720],
                    hm: 1,
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [4, [[200, 0, 0]]],
                                [5, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 4,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_4",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [58, 609, 100, 42] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [58, 609, 100, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [58, 609, 100, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [58, 609, 100, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35651584,
                            e: { l: [[3, [[8, 1, 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 5,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_5",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [182, 609, 100, 42] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nNext</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [182, 609, 100, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nNext</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [182, 609, 100, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nNext</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [182, 609, 100, 42] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nNext</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35651584,
                            e: { l: [[3, [[7, 1, 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        }
                    ],
                    e: null
                },
                {
                    at: "Blank Feedback",
                    i: 18,
                    de: "",
                    a: true,
                    fbi: "300_8",
                    n: "Blank Feedback",
                    m: 15,
                    w: 1,
                    b: { f: [1, 3036676095] },
                    d: 3000,
                    h: [720],
                    hm: 1,
                    ts: [2, 700],
                    tl: [[0, "Main Timeline"]],
                    e: null
                }
            ],
            mediaStats: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            mpv: "8.5.0",
            wmd:
                "iVBORw0KGgoAAAANSUhEUgAAAR0AAABJCAYAAAAAAvIuAAAABHNCSVQICAgIfAhkiAAAE61JREFUeJztnXlUU9e+x3+ZzEA0kDAYUkEmZZAIFawWYhT0WetIY/UOT7xoa3nO7e3i2j5cyqvXW322F8entk7Y3lYq1zr0VutQEbW9opc2WEBQELyACASihCQmIe8PeujJIWEyOSj9fdZiLc7Z++z9O/ucfM9v79/e5zDgZ6xWKxsAPgSAFYAgCOJctgPAWwwGw8wAALBarQkAsBMAQvvVLARBBjIlALCM8bOHUwgoOAiCuJ4SoktlV3AKyzU38n6sLspT194rqdQ+slqtVnrtQxDkWYHBYDBC/UWDFXLpMMVoWXhkoHiMnWyhDHtCojeadUcu3D6Vma0uoMFWBEEGIKvnyaPnJwTP4HPZbuT9nURHbzTr/vR/V/de+vF+Hb0mIggy0JgweqjPpv96cQlZeJjUTEcu3D6FgoMgiDO49OP9uiMXbp8i77MRncJyzQ3sUiEI4kwys9UFheWaG8S2jejk/VhdRL9JCIIMdMjaYis66tp79JuDIMhAh6wtNqJTUql9RL85CIIMdMjaYiM6OA8HQRBXQNaWTtErBEEQV4KigyAIraDoIAhCKyg6CILQCooOgiC0gqKDIAitoOggCEIrKDoIgtAKig6CILSCooMgCK2g6CAIQivs/qrY26Lhp7R9O2akpTZwGKMpkMuw8MjpRivLcM/qUX6LJS0/wJx04wFLrO8vWxEEcR60i463RcNfbzk6YxTUtL+02YGvxWVYeMGMhvBga0P4dEvhjJsW3xvrWXNPofggyLMNraKTbLoQsaDtyqtUr6YnjIKaMZ+ad0Ycbov7IouT8JMr7EMQxPXQNqbzgenAzNeslxb0RXAIuAwL7zXrpQUfmA7MdKZtCILQBy2i84HpwMxYa2Wcs8qLtVbGofAgyLOJy7tXyaYLET0VHKaXDNrqq3tUbqy1Mi7ZdKGc7q6WShkQsPYPsW9cK667umRz7gk663bEifdffs3PRxhsMJpbPz1X9uX2o4Vqum3I2TA1OUgmCu9J3ha9SWt8bGm9U6Ot2HGsME9dpmlytX3I04NLPR1vi4a/oO3Kq13l4UxIAuHWczDk0yIQZp6FIZ8WweCP/gn81I3A9JJ1Wf6Ctiuvels0fKca3Q0Lp4UlAgCM8HMfQWe9F3fMftve/r1pyll+PsJgAAAely34/eSQOXTaRaBKP5MVlZK95nhexUmT2WIipzXrjA1RKdlr3juYv+dOtbaIy2EKJCKedGyYz4v70ia9lbEo1mle8EAlZ8PU5IHSTi4VnfWWozMcjeGw/ENBuPUc8N/4MzA9fW3SGILBwFHMAWHmWeBMSHJYPpdh4a23HJ3hXKsdIw8Re0glfH8AAHc3rueKuZFyOur9ZG3ifHc3ricddT0p6/bnX9EZzVp7aTm5FRWq9DNZBWUN+cQ+DpvFeXm830t0teWzyIq5kfKeepHPAi4THW+Lht8RFqfA8g8FQfqhDrF5fPowtG74Q8ff49OHwdra/h5n/ht/Bpa/3U+tA0B7VIsub2d5UqSCw2ZxiO3p4/ziXV1nxqLYuFGBkmhH6Us2556oqmu5DQBAdK9cbdOTsmRz7gmyN8Rhszhz4gMm9adNTyvyELFH8tQRXfYWnjVcNqaT0vatXcEBAOCl/gUYgsFgbX0ErRsWgqWyxCbdXHwNjDk7QLA2C1h+I0GQfghaVk3uECJ7dW1iqS479ww6Iw+URJG3JSKeVB4i9nDVmMSKuZHyl8f7vdRdvllr/vGxK+p3JTqjWevOZnV4b0PcOM+EJ0cn8hCxx643lankB91AwGWezkhLbaC9/eywscDyGwkAAPo973YSHAJr6yPQf7gcAH7ubnXRzXJUlzOx15/msFmctN9E/4cr6tubppy1eHrY7wbaDecIi8Vq6j7Xr4cVcyPl+9ImvSXkc0T9bYuzcZmnM4zRZFcIBk1LBgAAS9UtMF8/32UZbfXVYL5xAdhjEoCjTILHp7N6VZcziZdLY85cu3d+6thhiTwuW0DsD5aJRvamnL1pylkj/NxHEGM0JrPF9FBnarisrr2+bn/+FYBfolHUY384MO994v+olOw1F3fMftveWE9USvaarqJJzTpjw8Tlx7cAtA9Qk8sgp5FtDh8ujiB+AC16k/Z6Sf311dsun+3NuZNx47JtfkzNLcYGe+dJcDyv4uS6/flXcjZMTZZ5ug3ncdmCqrqW21Qvrze2Zq6MnxIT6hVD5L3fqKtK2/PdZxsWj1MVlNYXE9ejL+XbO4c71dqijEP5JzcsHqeSSvj+HDaLY+/4zJXxUyZG+yZSj5+tCJg5WxEwk9weRJo8ROyxbmHsTKJtAAAatYbaLy9XfEuNZtq7b+5Ua4tU6WeyyG3SrDM2rNyat8/ZnrzLPB1HA8jsMQkAAGDKPdajckw/CxPhHfWmLmehUgYEcAexBOv251+pbtDdJafxuGxB5sr4Kd2VIQ8Re1zcMfvtsWE+L1rMVlPyxnObLhbUnOewWRyJiCedrQiYuTdNOQugvbsUlZK9hlpGVEr2GuIPAGDi8uNbiPGcTjann8m6U63t9JnoqrqW22RRmbj8+Jab5Y0FAO0/OnKaPETscXlX0jtjw3xeND62tCZvPLdp31fFf+NymIKJ0b6Jp7dMX9rdedtjb5pyFtmDM5ktpo9OFn1NbL93MH8PNQIGAHB6y/SlQTJROPGj8vMRBhMD0L219ZO1ifMnRvsmEnmTN57b1KA1NO5Lm/SWPcHvbfnJG89tatGbbAbU3YVcj11vKlP9fITBxPkL+RzRxGjfRJUyIIDIt3rb5bNRKdlrmnW/CDFAu9AQ158sOIRXFCQThVc36O5GpWSvuVZcd1Ui4kkXTw/7HXFfEazcmrePWjZxXSZG+yYSguruxvV0hSffb6vM2xx0q6hYezhvx5UsnBaWWHRX8xMAwN/OluZR0yMDxd1GFv66LD6ZeLrsOlZ4Ql2maaI+HfsShi8orS92lKZKP5NFvbkGsRmDqPlajWZ9i96kfentr3aR929bpVhM3ICEzduPFqprG/WVAABDJW5+PRFcAnmI2OOTtYnzo0M8Y4l9BqO5NetM6Rc5uRUVxL6c3IoKagQsMea5CTqDuSV547lNZEGqqW951Ftb5SFij5F+7qMAAHQGs05dpmlSl2ma/vO980eyzpR+Yc/23raFukzTVKdptbl5JSKeVPPQWB+Vkr2mUWuoJacRUzF6CzHQzGGzOAajuVWVfiYLoH2wnhC96BDPWLKoqcs0TY3NhgfkcnzEAlmQryggeeO5TeR7ptVodvpaR1pFp7t5N+R8/NSNwI7p03VwKvIQsYe3O8+XmAiYk1tRQb1hJCKelHxRqWQsio2TiHhSgPanOvkHdq247qrJbDGZzBZTaVVzqbPtz/1XzXfk7aESNz+qreHDxRHXS+qvk/ftTVPOIkSyRW/Skm0ur3lYSfwfE+oV050N7m5czx8OzHs/693JfxoVKInWGc3aRq2h9lpx3dVxqX//n55MZmQzGRxV+pksdZmmiQi532/UVeXkVlT01laVIiic8DT8fITBORumJhN5th8tVFM9RGe1RbPO2EB0By+ra23ae4iQ495dG9hj8xvjf0ucy4NmQw05TfPQWA/QPvbYnagJ+RwRIaY5F8u/MZktpha9SbvjWGGnh+yTQuuCT5vZxm6DHeZjj0kEjmIOMD1lYMzZSYNljlmeFKmgdqkuq2uvE31rgoXTwhJzcivsRpHi5dKOm5H6BP9ZzFw2s3nd/vwryud9x5P78GRbMxbFxrGZDA7V6wryFXUIk7mtzaaro20xthL/92Sg0944UW8h/6CobdZbW9V3GmpmK37R3SCZKPzyrqR3zl//96V1+/OvEN5CX8t3BNW7cAbEwwwAwGS2PCankbe7EzWymG4/Wqh25ax2l4mO0coy2BtraWuoAaanL3BiEh0OJHOU7ZEqRyFye3U9galdIg+URP3vZwWHyfvW7c+/Qh1Qlkr4/o7C5+RwMJvJpD0aVVrVXDo2zKfDBrKt8XJpjLq88QfqMWSbCU/FUfkr5kbKXb304r5G5/AH2xdbV7wqbyALsZDPEc1WBMyMHuEVlr7v+xzydXza2oJcF3lsLEgmCndkG3XgnkpL62O7EzpdgctE557VozyY0dBprMN06RhwX1kGHMUcePx1VqeQOTmkbuomukWuywkmdyJjUWyczmC2cacJbldrb5En7XHYLM7ypEiFvfVY5BujP0KgSzbnnvh+9ytRhEgSof5jl8qvDXHjeC7ZnLuVegzZ5ha9SRu/9Nhf6LSZSm1Da6OjtL7YunJr3r5tqxSLqVEcPx9h8K43lalL/5q7mxCep60tCDyH8Gy6C/aieT1FZzC3OMeq7nGZ6NxiScuDrZ1Fx5izE9gxkzsm/T0+nQWWovZZ8Uz/UOCqlgFAu0dkunQM2GFje1SXk80HgPZukUTEk3b1ZCMTPlwcAT3oKtH5NCSgimSwTDRy4bSwwVV1LWXdHfsszRXpqa3qMk3TxOXHt9ibWiDkc0TbVikW2+sSPs1t0ddxIbpx2UDyAeakG47SDLvfgbaGGmAIBgP3lWUgSD8IgvSDwFuwpmOmMjEx8Enr6isqZUCAG48tIoepqX/3G3VV5GOEfI7I3iRCagSJjuUTVDZ/XvANOerD47IFUgnfP+NQ/kl7+anhXmrY9WniSWxVpZ/Jeu9g/h7qNSJ7QE9rW+Tk3bEZ8HZ343p2FdB4WnCZ6DxgifU3wdeuGFgqS0D3ThIY/76z07iNKe9L0L37Ske3y1JZDJaqW2DKs7+k6Cb4uuT9ya/PDJ9mb6yDzFffV3VaekEeNCb4d13LPfL2UImbn70Fjr0JP/cWdZmmiQjvEjRqDbWOJn5Rw73yQEmUPETsQc134v2XX3Oupb2nt7ZmLIqNI9udk1tRMXH58S3Uh0hfy6cLdZmmiSqWS5MiOwmiPETsQY7Q9TeuXWXOmnvK0SCvtfURGHN2wqPXX4CHvw/v+NPvftcmymVtfQS6d5JAv/vdTmUYrSzDetbcU862O3Nl/JShEje/7t6Xs/1ooZp60SUinpQqHps/L/jGYDS3kvclTx3xKnneSM6GqcnU+T7UCXIZi2LjVsyNlJ/PnLWqL+d16Otim0Ey8oQ8KhmH8k9SPaNdbypTCbFUKQMCzmfOWkUOGfcXfbHVz0cYTPVYyPOUyNMi+qstLGbbpSGjAsVBxCRTQvSoUyIkIp709JbpSwmPJ2NRbNy2VYrF9uaX9Res9evXryc2dh//6ZwzC9cx+WaG1VL/PFSOdma5BAeZis+ussNrus/Zc/amKWeNDfN+kcVksuLlQyW3a7U1dRq9w+jYbxKCo4SCQTb9fJmXYNhzXsLHFwtq7gEA1Gn0Bj6P3RQZKA5lMZksAAAWk8kaLh0cmDonYnKSIjCeyWIwVm+/fJBc10sv+A0TD+F5Eduh/h4jnx/hFXk2/95FouwVqshJ5DwAAFKJQE+kkymubG6eoxg+QigYJLrfqKv674+uOVzGUKfRGyICJGyZl2AYYfMgDov3/AivyNQ5EZOVUbKYmxWNhcs+zLMRroxFsXERwz1GEce0nyuDQ26P7lApAwISnpeNJ5fh5c4f8sOd+lJ716K3tk6KlvmF+nuMlHkJh02Jfc7XYml7WFzZ3PzJ2sT53h4CqclsMR359s5X14oe1PW1LeQhYo/5CSEJgzisjgguk8Vg/KusvrhOozesXRjzioDH7hgIZjEZHM1Dw93iyuZmYl+Q7xB2qL9Hx1R88RCeV5IiML66Xnd3+9Gb/wQAuFhQc29K7HO+5HtAKBgkUkbJYlLnREwOkg0J/Pz87ZMHv751i2ybamKQgjfol+irgMt2a3pkqCLX72xS50RMBgBgWK1WK7HT3tR7Z+Ds15UCAOQz/K/8kZNidzyirzhay0SsS+lJXjLU+SnyELHHhsXjVN7uPF8iktSsMzaUVjWXOvKqcjZMTfbzEYbYW6fTlQ32bAZoF4XZioCZ1LU7jlApAwJenxk+TSLiSYkoTqPWUEteK0bY2ZN3vjiyi0xXA/dd3aM9tTVjUWzcC+Heo9P2fPcZeb2SyWwxNWoNtR+dLPraXsSyp+V3dQ6EZ+zoulHPL3Nl/JRx4d7jeVy2wGA0t1Y36O46uq5E4AOg3Ut2dC5d3Tc9vS/6AtEmtIgOgHOFxxWCgyCIayFEh7ZlEH/kpJz8mDHh8JNM5DNaWYaPGRMOo+AgyLMLrcsgsjgJP522RJXbfGyvh9wE3xvr2fixPQR51qH9C58PWGL9UtaSL7wtmlP4WWEE+fXRb98yf8AS6zexVJeBAy5/zSiCIE8P/fY+HQRBfp2g6CAIQisoOgiC0AqKDoIgtIKigyAIraDoIAhCKyg6CILQCooOgiC0gqKDIAitoOggCEIrKDoIgtCKjegwGAxGfxmCIMjAhawtNqIT6i9y/NlNBEGQPkLWFhvRUcilw+g3B0GQgQ5ZW2xFZ7Ss23fcIgiC9BayttiITmSgeMzqefLozocgCIL0jdXz5NGRgeKON4V2il7NTwieMWH0UB96zUIQZCAyYfRQn/kJwTPI+2y+BkGgN5p1Ry7cPpWZrS6gzzwEQQYSq+fJo+cnBM/gc9lu5P0Mq9W6DQBW2DuosFxzI+/H6qI8de29kkrtI3sChSAIAtAeFg/1Fw1WyKXDFKNl4eQulU0+q9XKBoBCAAil10QEQX6FlDAZDIYZAJYBQEl/W4MgyICmBACW/T+KDmGwgbt8XAAAAABJRU5ErkJggg==",
            options: {
                playerResource: "player/",
                opModes: 4,
                prezContainerID: "MyAPActivity",
                testMaxTime: 0,
                reportMethod: 0,
                css: "rlprez.css",
                passCondition: 0,
                reportFormat: 0,
                resourceLocation: "resources/",
                hilightFocus: false,
                reportAddress: "",
                scormScorePercent: false,
                showUnmuteMsg: true,
                passConditionValue: 80,
                autoplay: true,
                generatePreview: false,
                generateSeparatePackage: true,
                useWebmOgg: false,
                prezContainer: "",
                prezContainerResources: "resources\\",
                playerContainer: "player\\",
                indexContainerRes: "index-images\\",
                fileNamePrefix: "",
                lms: false,
                previewMode: false
            },
            toc: [
                {
                    c: [],
                    n: "1.",
                    t:
                        '<html><body style="font-family:\'Tahoma\';font-size:13px;">\r\n<p style="margin-top: 0px; margin-bottom: 0px; ">\r\nIntro</p>\r\n\r\n</body></html>\r\n',
                    s: 64,
                    d: 3000
                },
                {
                    c: [],
                    n: "2.",
                    t:
                        '<html><body style="font-family:\'Tahoma\';font-size:13px;">\r\n<p style="margin-top: 0px; margin-bottom: 0px; ">\r\nFill-in-the-blanks</p>\r\n\r\n</body></html>\r\n',
                    s: 65,
                    d: 3000
                },
                {
                    c: [],
                    n: "3.",
                    t:
                        '<html><body style="font-family:\'Tahoma\';font-size:13px;">\r\n<p style="margin-top: 0px; margin-bottom: 0px; ">\r\nMost-fun</p>\r\n\r\n</body></html>\r\n',
                    s: 66,
                    d: 3000
                }
            ],
            pcs: [
                {
                    i: -1,
                    h: [720],
                    a: true,
                    st: 0,
                    d: 9000,
                    tl: [[0, "Main Timeline"]]
                },
                null
            ],
            av: [],
            responsive: false,
            v: "8.5.0",
            vars: [["apScoreSubtract", "0", 2, 1]],
            slides: [
                {
                    at: "Intro",
                    i: 64,
                    de: "",
                    a: true,
                    n:
                        '<p style="margin-top: 0px; margin-bottom: 0px; ">\r\nIntro</p>\r\n\r\n\r\n',
                    d: 3000,
                    m: 15,
                    w: 1,
                    b: {
                        f: [
                            2,
                            0,
                            [
                                [0, 4286893730],
                                [100, 4294967295]
                            ],
                            90,
                            0,
                            100
                        ]
                    },
                    h: [720],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [1, [[200, 0, 0]]],
                                [2, [[200, 0, 0]]],
                                [4, [[200, 0, 0]]],
                                [33, [[200, 0, 0]]],
                                [32, [[200, 0, 0]]],
                                [18, [[200, 0, 0]]],
                                [19, [[200, 0, 0]]],
                                [26, [[200, 0, 0]]],
                                [27, [[200, 0, 0]]],
                                [14, [[200, 0, 0]]],
                                [15, [[200, 0, 0]]],
                                [28, [[200, 0, 0]]],
                                [29, [[200, 0, 0]]],
                                [16, [[200, 0, 0]]],
                                [17, [[200, 0, 0]]],
                                [30, [[200, 0, 0]]],
                                [31, [[200, 0, 0]]],
                                [20, [[200, 0, 0]]],
                                [21, [[200, 0, 0]]],
                                [22, [[200, 0, 0]]],
                                [23, [[200, 0, 0]]],
                                [24, [[200, 0, 0]]],
                                [25, [[200, 0, 0]]],
                                [42, [[200, 0, 0]]],
                                [41, [[200, 0, 0]]],
                                [43, [[200, 0, 0]]],
                                [40, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 42,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_8",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [932, 518, 348, 202],
                                            p: [
                                                [
                                                    [
                                                        311974,
                                                        0,
                                                        311974,
                                                        0,
                                                        311692,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        311128,
                                                        0,
                                                        311410,
                                                        0,
                                                        310846,
                                                        0
                                                    ],
                                                    [
                                                        310000,
                                                        0,
                                                        310564,
                                                        0,
                                                        277561,
                                                        0
                                                    ],
                                                    [
                                                        238635,
                                                        36061,
                                                        249918,
                                                        14886,
                                                        234404,
                                                        43190
                                                    ],
                                                    [
                                                        232147,
                                                        59543,
                                                        232147,
                                                        51157,
                                                        232147,
                                                        64575
                                                    ],
                                                    [
                                                        234686,
                                                        74429,
                                                        232993,
                                                        69606,
                                                        203094,
                                                        76106
                                                    ],
                                                    [
                                                        166988,
                                                        113215,
                                                        176578,
                                                        91830,
                                                        150064,
                                                        105248
                                                    ],
                                                    [
                                                        108316,
                                                        100426,
                                                        129754,
                                                        100426,
                                                        48517,
                                                        100426
                                                    ],
                                                    [
                                                        0,
                                                        180725,
                                                        0,
                                                        136487,
                                                        0,
                                                        202320
                                                    ],
                                                    [
                                                        0,
                                                        202320,
                                                        0,
                                                        202320,
                                                        347234,
                                                        202320
                                                    ],
                                                    [
                                                        347234,
                                                        202320,
                                                        347234,
                                                        202320,
                                                        347234,
                                                        180725
                                                    ],
                                                    [
                                                        347234,
                                                        180725,
                                                        347234,
                                                        180725,
                                                        347234,
                                                        115731
                                                    ],
                                                    [
                                                        347234,
                                                        115731,
                                                        347234,
                                                        115731,
                                                        350336,
                                                        114893
                                                    ],
                                                    [
                                                        347234,
                                                        113006,
                                                        344413,
                                                        114054,
                                                        347234,
                                                        6080
                                                    ],
                                                    [
                                                        347234,
                                                        6080,
                                                        347234,
                                                        6080,
                                                        336514,
                                                        2097
                                                    ],
                                                    [
                                                        311974,
                                                        0,
                                                        324668,
                                                        0,
                                                        311974,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        311974,
                                                        0,
                                                        311974,
                                                        0,
                                                        311692,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        311128,
                                                        0,
                                                        311410,
                                                        0,
                                                        310846,
                                                        0
                                                    ],
                                                    [
                                                        310000,
                                                        0,
                                                        310564,
                                                        0,
                                                        277561,
                                                        0
                                                    ],
                                                    [
                                                        238635,
                                                        36061,
                                                        249918,
                                                        14886,
                                                        234404,
                                                        43190
                                                    ],
                                                    [
                                                        232147,
                                                        59543,
                                                        232147,
                                                        51157,
                                                        232147,
                                                        64575
                                                    ],
                                                    [
                                                        234686,
                                                        74429,
                                                        232993,
                                                        69606,
                                                        203094,
                                                        76106
                                                    ],
                                                    [
                                                        166988,
                                                        113215,
                                                        176578,
                                                        91830,
                                                        150064,
                                                        105248
                                                    ],
                                                    [
                                                        108316,
                                                        100426,
                                                        129754,
                                                        100426,
                                                        48517,
                                                        100426
                                                    ],
                                                    [
                                                        0,
                                                        180725,
                                                        0,
                                                        136487,
                                                        0,
                                                        202320
                                                    ],
                                                    [
                                                        0,
                                                        202320,
                                                        0,
                                                        202320,
                                                        347234,
                                                        202320
                                                    ],
                                                    [
                                                        347234,
                                                        202320,
                                                        347234,
                                                        202320,
                                                        347234,
                                                        180725
                                                    ],
                                                    [
                                                        347234,
                                                        180725,
                                                        347234,
                                                        180725,
                                                        347234,
                                                        115731
                                                    ],
                                                    [
                                                        347234,
                                                        115731,
                                                        347234,
                                                        115731,
                                                        350336,
                                                        114893
                                                    ],
                                                    [
                                                        347234,
                                                        113006,
                                                        344413,
                                                        114054,
                                                        347234,
                                                        6080
                                                    ],
                                                    [
                                                        347234,
                                                        6080,
                                                        347234,
                                                        6080,
                                                        336514,
                                                        2097
                                                    ],
                                                    [
                                                        311974,
                                                        0,
                                                        324668,
                                                        0,
                                                        311974,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4294967295]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 41,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_7",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 487, 300, 233],
                                            p: [
                                                [
                                                    [
                                                        203594,
                                                        102292,
                                                        203594,
                                                        102292,
                                                        184608,
                                                        102292,
                                                        1
                                                    ],
                                                    [
                                                        151634,
                                                        115319,
                                                        166622,
                                                        106990,
                                                        142890,
                                                        93109
                                                    ],
                                                    [
                                                        90181,
                                                        75812,
                                                        118909,
                                                        76879,
                                                        92179,
                                                        70259
                                                    ],
                                                    [
                                                        93178,
                                                        58300,
                                                        93178,
                                                        64493,
                                                        93178,
                                                        26054
                                                    ],
                                                    [
                                                        24981,
                                                        0,
                                                        62702,
                                                        0,
                                                        15988,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        3844,
                                                        7744,
                                                        1281,
                                                        0,
                                                        87343
                                                    ],
                                                    [
                                                        0,
                                                        87343,
                                                        0,
                                                        87343,
                                                        0,
                                                        112756
                                                    ],
                                                    [
                                                        0,
                                                        112756,
                                                        0,
                                                        112756,
                                                        0,
                                                        184083
                                                    ],
                                                    [
                                                        0,
                                                        184083,
                                                        0,
                                                        184083,
                                                        0,
                                                        215689
                                                    ],
                                                    [
                                                        0,
                                                        215689,
                                                        0,
                                                        215689,
                                                        0,
                                                        232560
                                                    ],
                                                    [
                                                        0,
                                                        232560,
                                                        0,
                                                        232560,
                                                        299520,
                                                        232560
                                                    ],
                                                    [
                                                        299520,
                                                        232560,
                                                        299520,
                                                        232560,
                                                        299520,
                                                        184083
                                                    ],
                                                    [
                                                        299520,
                                                        184083,
                                                        299520,
                                                        184083,
                                                        299520,
                                                        138810
                                                    ],
                                                    [
                                                        203594,
                                                        102292,
                                                        256553,
                                                        102292,
                                                        203594,
                                                        102292
                                                    ]
                                                ],
                                                [
                                                    [
                                                        203594,
                                                        102292,
                                                        203594,
                                                        102292,
                                                        184608,
                                                        102292,
                                                        1
                                                    ],
                                                    [
                                                        151634,
                                                        115319,
                                                        166622,
                                                        106990,
                                                        142890,
                                                        93109
                                                    ],
                                                    [
                                                        90181,
                                                        75812,
                                                        118909,
                                                        76879,
                                                        92179,
                                                        70259
                                                    ],
                                                    [
                                                        93178,
                                                        58300,
                                                        93178,
                                                        64493,
                                                        93178,
                                                        26054
                                                    ],
                                                    [
                                                        24981,
                                                        0,
                                                        62702,
                                                        0,
                                                        15988,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        3844,
                                                        7744,
                                                        1281,
                                                        0,
                                                        87343
                                                    ],
                                                    [
                                                        0,
                                                        87343,
                                                        0,
                                                        87343,
                                                        0,
                                                        112756
                                                    ],
                                                    [
                                                        0,
                                                        112756,
                                                        0,
                                                        112756,
                                                        0,
                                                        184083
                                                    ],
                                                    [
                                                        0,
                                                        184083,
                                                        0,
                                                        184083,
                                                        0,
                                                        215689
                                                    ],
                                                    [
                                                        0,
                                                        215689,
                                                        0,
                                                        215689,
                                                        0,
                                                        232560
                                                    ],
                                                    [
                                                        0,
                                                        232560,
                                                        0,
                                                        232560,
                                                        299520,
                                                        232560
                                                    ],
                                                    [
                                                        299520,
                                                        232560,
                                                        299520,
                                                        232560,
                                                        299520,
                                                        184083
                                                    ],
                                                    [
                                                        299520,
                                                        184083,
                                                        299520,
                                                        184083,
                                                        299520,
                                                        138810
                                                    ],
                                                    [
                                                        203594,
                                                        102292,
                                                        256553,
                                                        102292,
                                                        203594,
                                                        102292
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4294967295]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 43,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_9",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [753, 640, 527, 80],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        79920,
                                                        90296,
                                                        34859,
                                                        259736,
                                                        79920
                                                    ],
                                                    [
                                                        527360,
                                                        79916,
                                                        527360,
                                                        79916,
                                                        527142,
                                                        54950
                                                    ],
                                                    [
                                                        526704,
                                                        5020,
                                                        526923,
                                                        29985,
                                                        336389,
                                                        -16389,
                                                        2
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        79920,
                                                        90296,
                                                        34859,
                                                        259736,
                                                        79920
                                                    ],
                                                    [
                                                        527360,
                                                        79916,
                                                        527360,
                                                        79916,
                                                        527142,
                                                        54950
                                                    ],
                                                    [
                                                        526704,
                                                        5020,
                                                        526923,
                                                        29985,
                                                        336389,
                                                        -16389,
                                                        2
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4292144491]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 40,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_6",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 620, 932, 100],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        1
                                                    ],
                                                    [
                                                        931840,
                                                        100080,
                                                        423291,
                                                        -56455,
                                                        0,
                                                        100080
                                                    ],
                                                    [
                                                        0,
                                                        100080,
                                                        0,
                                                        100080,
                                                        0,
                                                        72525
                                                    ],
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        44970,
                                                        0,
                                                        17415
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        1
                                                    ],
                                                    [
                                                        931840,
                                                        100080,
                                                        423291,
                                                        -56455,
                                                        0,
                                                        100080
                                                    ],
                                                    [
                                                        0,
                                                        100080,
                                                        0,
                                                        100080,
                                                        0,
                                                        72525
                                                    ],
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        44970,
                                                        0,
                                                        17415
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4288465975]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 33,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_28",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [678, 374, 602, 346],
                                            p: [
                                                [
                                                    [
                                                        539073,
                                                        0,
                                                        539073,
                                                        0,
                                                        538586,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        537611,
                                                        0,
                                                        538099,
                                                        0,
                                                        537124,
                                                        0
                                                    ],
                                                    [
                                                        535661,
                                                        0,
                                                        536636,
                                                        0,
                                                        479609,
                                                        0
                                                    ],
                                                    [
                                                        412347,
                                                        61727,
                                                        431844,
                                                        25481,
                                                        405036,
                                                        73930
                                                    ],
                                                    [
                                                        401137,
                                                        101922,
                                                        401137,
                                                        87567,
                                                        401137,
                                                        110535
                                                    ],
                                                    [
                                                        405523,
                                                        127403,
                                                        402599,
                                                        119148,
                                                        350934,
                                                        130274
                                                    ],
                                                    [
                                                        288545,
                                                        193796,
                                                        305117,
                                                        157190,
                                                        259301,
                                                        180158
                                                    ],
                                                    [
                                                        187165,
                                                        171904,
                                                        224207,
                                                        171904,
                                                        83834,
                                                        171904
                                                    ],
                                                    [
                                                        0,
                                                        309355,
                                                        0,
                                                        233631,
                                                        0,
                                                        346320
                                                    ],
                                                    [
                                                        0,
                                                        346320,
                                                        0,
                                                        346320,
                                                        599999,
                                                        346320
                                                    ],
                                                    [
                                                        599999,
                                                        346320,
                                                        599999,
                                                        346320,
                                                        599999,
                                                        309355
                                                    ],
                                                    [
                                                        599999,
                                                        309355,
                                                        599999,
                                                        309355,
                                                        599999,
                                                        198102
                                                    ],
                                                    [
                                                        599999,
                                                        198102,
                                                        599999,
                                                        198102,
                                                        605361,
                                                        196667
                                                    ],
                                                    [
                                                        599999,
                                                        193437,
                                                        595125,
                                                        195231,
                                                        599999,
                                                        10408
                                                    ],
                                                    [
                                                        599999,
                                                        10408,
                                                        599999,
                                                        10408,
                                                        581477,
                                                        3589
                                                    ],
                                                    [
                                                        539073,
                                                        0,
                                                        561007,
                                                        0,
                                                        539073,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        539073,
                                                        0,
                                                        539073,
                                                        0,
                                                        538586,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        537611,
                                                        0,
                                                        538099,
                                                        0,
                                                        537124,
                                                        0
                                                    ],
                                                    [
                                                        535661,
                                                        0,
                                                        536636,
                                                        0,
                                                        479609,
                                                        0
                                                    ],
                                                    [
                                                        412347,
                                                        61727,
                                                        431844,
                                                        25481,
                                                        405036,
                                                        73930
                                                    ],
                                                    [
                                                        401137,
                                                        101922,
                                                        401137,
                                                        87567,
                                                        401137,
                                                        110535
                                                    ],
                                                    [
                                                        405523,
                                                        127403,
                                                        402599,
                                                        119148,
                                                        350934,
                                                        130274
                                                    ],
                                                    [
                                                        288545,
                                                        193796,
                                                        305117,
                                                        157190,
                                                        259301,
                                                        180158
                                                    ],
                                                    [
                                                        187165,
                                                        171904,
                                                        224207,
                                                        171904,
                                                        83834,
                                                        171904
                                                    ],
                                                    [
                                                        0,
                                                        309355,
                                                        0,
                                                        233631,
                                                        0,
                                                        346320
                                                    ],
                                                    [
                                                        0,
                                                        346320,
                                                        0,
                                                        346320,
                                                        599999,
                                                        346320
                                                    ],
                                                    [
                                                        599999,
                                                        346320,
                                                        599999,
                                                        346320,
                                                        599999,
                                                        309355
                                                    ],
                                                    [
                                                        599999,
                                                        309355,
                                                        599999,
                                                        309355,
                                                        599999,
                                                        198102
                                                    ],
                                                    [
                                                        599999,
                                                        198102,
                                                        599999,
                                                        198102,
                                                        605361,
                                                        196667
                                                    ],
                                                    [
                                                        599999,
                                                        193437,
                                                        595125,
                                                        195231,
                                                        599999,
                                                        10408
                                                    ],
                                                    [
                                                        599999,
                                                        10408,
                                                        599999,
                                                        10408,
                                                        581477,
                                                        3589
                                                    ],
                                                    [
                                                        539073,
                                                        0,
                                                        561007,
                                                        0,
                                                        539073,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4294967295]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 32,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_27",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 382, 364, 338],
                                            p: [
                                                [
                                                    [
                                                        247097,
                                                        148530,
                                                        247097,
                                                        148530,
                                                        224054,
                                                        148530,
                                                        1
                                                    ],
                                                    [
                                                        184034,
                                                        167445,
                                                        202225,
                                                        155351,
                                                        173422,
                                                        135196
                                                    ],
                                                    [
                                                        109450,
                                                        110079,
                                                        144316,
                                                        111630,
                                                        111876,
                                                        102017
                                                    ],
                                                    [
                                                        113088,
                                                        84653,
                                                        113088,
                                                        93645,
                                                        113088,
                                                        37830
                                                    ],
                                                    [
                                                        30319,
                                                        0,
                                                        76100,
                                                        0,
                                                        19404,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        5582,
                                                        9399,
                                                        1861,
                                                        0,
                                                        126824
                                                    ],
                                                    [
                                                        0,
                                                        126824,
                                                        0,
                                                        126824,
                                                        0,
                                                        163724
                                                    ],
                                                    [
                                                        0,
                                                        163724,
                                                        0,
                                                        163724,
                                                        0,
                                                        267291
                                                    ],
                                                    [
                                                        0,
                                                        267291,
                                                        0,
                                                        267291,
                                                        0,
                                                        313183
                                                    ],
                                                    [
                                                        0,
                                                        313183,
                                                        0,
                                                        313183,
                                                        0,
                                                        337680
                                                    ],
                                                    [
                                                        0,
                                                        337680,
                                                        0,
                                                        337680,
                                                        363520,
                                                        337680
                                                    ],
                                                    [
                                                        363520,
                                                        337680,
                                                        363520,
                                                        337680,
                                                        363520,
                                                        267291
                                                    ],
                                                    [
                                                        363520,
                                                        267291,
                                                        363520,
                                                        267291,
                                                        363520,
                                                        201554
                                                    ],
                                                    [
                                                        247097,
                                                        148530,
                                                        311372,
                                                        148530,
                                                        247097,
                                                        148530
                                                    ]
                                                ],
                                                [
                                                    [
                                                        247097,
                                                        148530,
                                                        247097,
                                                        148530,
                                                        224054,
                                                        148530,
                                                        1
                                                    ],
                                                    [
                                                        184034,
                                                        167445,
                                                        202225,
                                                        155351,
                                                        173422,
                                                        135196
                                                    ],
                                                    [
                                                        109450,
                                                        110079,
                                                        144316,
                                                        111630,
                                                        111876,
                                                        102017
                                                    ],
                                                    [
                                                        113088,
                                                        84653,
                                                        113088,
                                                        93645,
                                                        113088,
                                                        37830
                                                    ],
                                                    [
                                                        30319,
                                                        0,
                                                        76100,
                                                        0,
                                                        19404,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        5582,
                                                        9399,
                                                        1861,
                                                        0,
                                                        126824
                                                    ],
                                                    [
                                                        0,
                                                        126824,
                                                        0,
                                                        126824,
                                                        0,
                                                        163724
                                                    ],
                                                    [
                                                        0,
                                                        163724,
                                                        0,
                                                        163724,
                                                        0,
                                                        267291
                                                    ],
                                                    [
                                                        0,
                                                        267291,
                                                        0,
                                                        267291,
                                                        0,
                                                        313183
                                                    ],
                                                    [
                                                        0,
                                                        313183,
                                                        0,
                                                        313183,
                                                        0,
                                                        337680
                                                    ],
                                                    [
                                                        0,
                                                        337680,
                                                        0,
                                                        337680,
                                                        363520,
                                                        337680
                                                    ],
                                                    [
                                                        363520,
                                                        337680,
                                                        363520,
                                                        337680,
                                                        363520,
                                                        267291
                                                    ],
                                                    [
                                                        363520,
                                                        267291,
                                                        363520,
                                                        267291,
                                                        363520,
                                                        201554
                                                    ],
                                                    [
                                                        247097,
                                                        148530,
                                                        311372,
                                                        148530,
                                                        247097,
                                                        148530
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4294967295]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 18,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_13",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [190, 173, 61, 418],
                                            p: [
                                                [
                                                    [
                                                        19703,
                                                        0,
                                                        19703,
                                                        0,
                                                        19703,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        42147,
                                                        411593,
                                                        -37080,
                                                        216928,
                                                        61000,
                                                        418065
                                                    ],
                                                    [
                                                        61000,
                                                        418065,
                                                        61000,
                                                        418065,
                                                        61000,
                                                        418065
                                                    ],
                                                    [
                                                        23294,
                                                        0,
                                                        -31918,
                                                        257828,
                                                        22097,
                                                        0
                                                    ],
                                                    [
                                                        19703,
                                                        0,
                                                        20900,
                                                        0,
                                                        19703,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        19703,
                                                        0,
                                                        19703,
                                                        0,
                                                        19703,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        42147,
                                                        411593,
                                                        -37080,
                                                        216928,
                                                        61000,
                                                        418065
                                                    ],
                                                    [
                                                        61000,
                                                        418065,
                                                        61000,
                                                        418065,
                                                        61000,
                                                        418065
                                                    ],
                                                    [
                                                        23294,
                                                        0,
                                                        -31918,
                                                        257828,
                                                        22097,
                                                        0
                                                    ],
                                                    [
                                                        19703,
                                                        0,
                                                        20900,
                                                        0,
                                                        19703,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4291611595]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 19,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_14",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [193, 174, 6, 86],
                                            p: [
                                                [
                                                    [
                                                        1061,
                                                        0,
                                                        1061,
                                                        0,
                                                        1061,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        4589,
                                                        85935,
                                                        -2937,
                                                        37050,
                                                        6000,
                                                        68439
                                                    ],
                                                    [
                                                        6000,
                                                        68439,
                                                        6000,
                                                        68439,
                                                        6000,
                                                        68439
                                                    ],
                                                    [
                                                        2472,
                                                        1286,
                                                        -585,
                                                        20326,
                                                        2002,
                                                        858
                                                    ],
                                                    [
                                                        1061,
                                                        0,
                                                        1531,
                                                        429,
                                                        1061,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        1061,
                                                        0,
                                                        1061,
                                                        0,
                                                        1061,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        4589,
                                                        85935,
                                                        -2937,
                                                        37050,
                                                        6000,
                                                        68439
                                                    ],
                                                    [
                                                        6000,
                                                        68439,
                                                        6000,
                                                        68439,
                                                        6000,
                                                        68439
                                                    ],
                                                    [
                                                        2472,
                                                        1286,
                                                        -585,
                                                        20326,
                                                        2002,
                                                        858
                                                    ],
                                                    [
                                                        1061,
                                                        0,
                                                        1531,
                                                        429,
                                                        1061,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4291611595]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 26,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_21",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [166, 79, 98, 115],
                                            p: [
                                                [
                                                    [
                                                        96664,
                                                        47056,
                                                        96664,
                                                        47056,
                                                        103117,
                                                        77284,
                                                        1
                                                    ],
                                                    [
                                                        58168,
                                                        114808,
                                                        85538,
                                                        112203,
                                                        35916,
                                                        116893
                                                    ],
                                                    [
                                                        313,
                                                        69467,
                                                        3650,
                                                        98391,
                                                        -2803,
                                                        43148
                                                    ],
                                                    [
                                                        38809,
                                                        1975,
                                                        17892,
                                                        9793,
                                                        63731,
                                                        -7666
                                                    ],
                                                    [
                                                        96664,
                                                        47056,
                                                        90878,
                                                        19695,
                                                        96664,
                                                        47056
                                                    ]
                                                ],
                                                [
                                                    [
                                                        96664,
                                                        47056,
                                                        96664,
                                                        47056,
                                                        103117,
                                                        77284,
                                                        1
                                                    ],
                                                    [
                                                        58168,
                                                        114808,
                                                        85538,
                                                        112203,
                                                        35916,
                                                        116893
                                                    ],
                                                    [
                                                        313,
                                                        69467,
                                                        3650,
                                                        98391,
                                                        -2803,
                                                        43148
                                                    ],
                                                    [
                                                        38809,
                                                        1975,
                                                        17892,
                                                        9793,
                                                        63731,
                                                        -7666
                                                    ],
                                                    [
                                                        96664,
                                                        47056,
                                                        90878,
                                                        19695,
                                                        96664,
                                                        47056
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4292287087]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 27,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_22",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [181, 81, 75, 88],
                                            p: [
                                                [
                                                    [
                                                        73989,
                                                        36293,
                                                        73989,
                                                        36293,
                                                        78878,
                                                        59580,
                                                        1
                                                    ],
                                                    [
                                                        44655,
                                                        88101,
                                                        65544,
                                                        86270,
                                                        27544,
                                                        89933
                                                    ],
                                                    [
                                                        210,
                                                        53301,
                                                        2877,
                                                        75542,
                                                        -2012,
                                                        33153
                                                    ],
                                                    [
                                                        29766,
                                                        1492,
                                                        13766,
                                                        7510,
                                                        48878,
                                                        -5834
                                                    ],
                                                    [
                                                        73989,
                                                        36293,
                                                        69544,
                                                        15099,
                                                        73989,
                                                        36293
                                                    ]
                                                ],
                                                [
                                                    [
                                                        73989,
                                                        36293,
                                                        73989,
                                                        36293,
                                                        78878,
                                                        59580,
                                                        1
                                                    ],
                                                    [
                                                        44655,
                                                        88101,
                                                        65544,
                                                        86270,
                                                        27544,
                                                        89933
                                                    ],
                                                    [
                                                        210,
                                                        53301,
                                                        2877,
                                                        75542,
                                                        -2012,
                                                        33153
                                                    ],
                                                    [
                                                        29766,
                                                        1492,
                                                        13766,
                                                        7510,
                                                        48878,
                                                        -5834
                                                    ],
                                                    [
                                                        73989,
                                                        36293,
                                                        69544,
                                                        15099,
                                                        73989,
                                                        36293
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4293664377]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 14,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_9",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [158, 317, 84, 265],
                                            p: [
                                                [
                                                    [
                                                        1261,
                                                        0,
                                                        1261,
                                                        0,
                                                        1261,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        64941,
                                                        264774,
                                                        -14435,
                                                        117879,
                                                        84000,
                                                        263997
                                                    ],
                                                    [
                                                        84000,
                                                        263997,
                                                        84000,
                                                        263997,
                                                        84000,
                                                        263997
                                                    ],
                                                    [
                                                        4848,
                                                        0,
                                                        -5690,
                                                        148450,
                                                        3652,
                                                        0
                                                    ],
                                                    [1261, 0, 2456, 0, 1261, 0]
                                                ],
                                                [
                                                    [
                                                        1261,
                                                        0,
                                                        1261,
                                                        0,
                                                        1261,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        64941,
                                                        264774,
                                                        -14435,
                                                        117879,
                                                        84000,
                                                        263997
                                                    ],
                                                    [
                                                        84000,
                                                        263997,
                                                        84000,
                                                        263997,
                                                        84000,
                                                        263997
                                                    ],
                                                    [
                                                        4848,
                                                        0,
                                                        -5690,
                                                        148450,
                                                        3652,
                                                        0
                                                    ],
                                                    [1261, 0, 2456, 0, 1261, 0]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4291611595]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 15,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_10",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [127, 286, 37, 125],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        1301,
                                                        0,
                                                        1301,
                                                        0,
                                                        1301,
                                                        1
                                                    ],
                                                    [
                                                        37000,
                                                        125419,
                                                        30173,
                                                        74419,
                                                        36119,
                                                        100439
                                                    ],
                                                    [
                                                        36119,
                                                        100439,
                                                        36119,
                                                        100439,
                                                        36119,
                                                        100439
                                                    ],
                                                    [
                                                        1321,
                                                        0,
                                                        33036,
                                                        79363,
                                                        881,
                                                        434
                                                    ],
                                                    [0, 1301, 440, 867, 0, 1301]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        1301,
                                                        0,
                                                        1301,
                                                        0,
                                                        1301,
                                                        1
                                                    ],
                                                    [
                                                        37000,
                                                        125419,
                                                        30173,
                                                        74419,
                                                        36119,
                                                        100439
                                                    ],
                                                    [
                                                        36119,
                                                        100439,
                                                        36119,
                                                        100439,
                                                        36119,
                                                        100439
                                                    ],
                                                    [
                                                        1321,
                                                        0,
                                                        33036,
                                                        79363,
                                                        881,
                                                        434
                                                    ],
                                                    [0, 1301, 440, 867, 0, 1301]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4291611595]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 28,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_23",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [109, 222, 98, 115],
                                            p: [
                                                [
                                                    [
                                                        97961,
                                                        57602,
                                                        97961,
                                                        57602,
                                                        99069,
                                                        88469,
                                                        1
                                                    ],
                                                    [
                                                        49003,
                                                        114667,
                                                        76251,
                                                        118298,
                                                        26850,
                                                        111554
                                                    ],
                                                    [
                                                        45,
                                                        57343,
                                                        -1284,
                                                        86135,
                                                        1375,
                                                        30885
                                                    ],
                                                    [
                                                        49003,
                                                        278,
                                                        27293,
                                                        3131,
                                                        74922,
                                                        -3354
                                                    ],
                                                    [
                                                        97961,
                                                        57602,
                                                        96854,
                                                        29329,
                                                        97961,
                                                        57602
                                                    ]
                                                ],
                                                [
                                                    [
                                                        97961,
                                                        57602,
                                                        97961,
                                                        57602,
                                                        99069,
                                                        88469,
                                                        1
                                                    ],
                                                    [
                                                        49003,
                                                        114667,
                                                        76251,
                                                        118298,
                                                        26850,
                                                        111554
                                                    ],
                                                    [
                                                        45,
                                                        57343,
                                                        -1284,
                                                        86135,
                                                        1375,
                                                        30885
                                                    ],
                                                    [
                                                        49003,
                                                        278,
                                                        27293,
                                                        3131,
                                                        74922,
                                                        -3354
                                                    ],
                                                    [
                                                        97961,
                                                        57602,
                                                        96854,
                                                        29329,
                                                        97961,
                                                        57602
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4292497955]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 29,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_24",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [122, 223, 81, 94],
                                            p: [
                                                [
                                                    [
                                                        80954,
                                                        47004,
                                                        80954,
                                                        47004,
                                                        82071,
                                                        72341,
                                                        1
                                                    ],
                                                    [
                                                        40504,
                                                        93799,
                                                        62852,
                                                        96901,
                                                        22179,
                                                        91472
                                                    ],
                                                    [
                                                        55,
                                                        47004,
                                                        -1286,
                                                        70531,
                                                        1172,
                                                        25287
                                                    ],
                                                    [
                                                        40504,
                                                        210,
                                                        22403,
                                                        2537,
                                                        61958,
                                                        -2634
                                                    ],
                                                    [
                                                        80954,
                                                        47004,
                                                        80060,
                                                        23995,
                                                        80954,
                                                        47004
                                                    ]
                                                ],
                                                [
                                                    [
                                                        80954,
                                                        47004,
                                                        80954,
                                                        47004,
                                                        82071,
                                                        72341,
                                                        1
                                                    ],
                                                    [
                                                        40504,
                                                        93799,
                                                        62852,
                                                        96901,
                                                        22179,
                                                        91472
                                                    ],
                                                    [
                                                        55,
                                                        47004,
                                                        -1286,
                                                        70531,
                                                        1172,
                                                        25287
                                                    ],
                                                    [
                                                        40504,
                                                        210,
                                                        22403,
                                                        2537,
                                                        61958,
                                                        -2634
                                                    ],
                                                    [
                                                        80954,
                                                        47004,
                                                        80060,
                                                        23995,
                                                        80954,
                                                        47004
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4293941798]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 16,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_11",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [1051, 150, 64, 427],
                                            p: [
                                                [
                                                    [0, 0, 0, 0, 0, 0, 1],
                                                    [
                                                        26683,
                                                        419311,
                                                        106734,
                                                        163988,
                                                        41582,
                                                        427355
                                                    ],
                                                    [
                                                        41582,
                                                        427355,
                                                        41582,
                                                        427355,
                                                        41582,
                                                        427355
                                                    ],
                                                    [
                                                        5114,
                                                        0,
                                                        111181,
                                                        208877,
                                                        3410,
                                                        0
                                                    ],
                                                    [0, 0, 1705, 0, 0, 0]
                                                ],
                                                [
                                                    [0, 0, 0, 0, 0, 0, 1],
                                                    [
                                                        26683,
                                                        419311,
                                                        106734,
                                                        163988,
                                                        41582,
                                                        427355
                                                    ],
                                                    [
                                                        41582,
                                                        427355,
                                                        41582,
                                                        427355,
                                                        41582,
                                                        427355
                                                    ],
                                                    [
                                                        5114,
                                                        0,
                                                        111181,
                                                        208877,
                                                        3410,
                                                        0
                                                    ],
                                                    [0, 0, 1705, 0, 0, 0]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4291611595]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 17,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_12",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [1093, 188, 14, 130],
                                            p: [
                                                [
                                                    [0, 0, 0, 0, 0, 0, 1],
                                                    [
                                                        10042,
                                                        109597,
                                                        16889,
                                                        37568,
                                                        13009,
                                                        130065
                                                    ],
                                                    [
                                                        13009,
                                                        130065,
                                                        13009,
                                                        130065,
                                                        13009,
                                                        130065
                                                    ],
                                                    [
                                                        2739,
                                                        2591,
                                                        18715,
                                                        43010,
                                                        1826,
                                                        1727
                                                    ],
                                                    [0, 0, 913, 864, 0, 0]
                                                ],
                                                [
                                                    [0, 0, 0, 0, 0, 0, 1],
                                                    [
                                                        10042,
                                                        109597,
                                                        16889,
                                                        37568,
                                                        13009,
                                                        130065
                                                    ],
                                                    [
                                                        13009,
                                                        130065,
                                                        13009,
                                                        130065,
                                                        13009,
                                                        130065
                                                    ],
                                                    [
                                                        2739,
                                                        2591,
                                                        18715,
                                                        43010,
                                                        1826,
                                                        1727
                                                    ],
                                                    [0, 0, 913, 864, 0, 0]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4291611595]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 30,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_25",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [1032, 125, 97, 113],
                                            p: [
                                                [
                                                    [
                                                        93477,
                                                        37901,
                                                        93477,
                                                        37901,
                                                        103678,
                                                        66280,
                                                        1
                                                    ],
                                                    [
                                                        64427,
                                                        111171,
                                                        91038,
                                                        103431,
                                                        42916,
                                                        117105
                                                    ],
                                                    [
                                                        1446,
                                                        77374,
                                                        8765,
                                                        104979,
                                                        -4985,
                                                        52348
                                                    ],
                                                    [
                                                        30497,
                                                        4362,
                                                        10982,
                                                        15971,
                                                        53782,
                                                        -9570
                                                    ],
                                                    [
                                                        93477,
                                                        37901,
                                                        83942,
                                                        12102,
                                                        93477,
                                                        37901
                                                    ]
                                                ],
                                                [
                                                    [
                                                        93477,
                                                        37901,
                                                        93477,
                                                        37901,
                                                        103678,
                                                        66280,
                                                        1
                                                    ],
                                                    [
                                                        64427,
                                                        111171,
                                                        91038,
                                                        103431,
                                                        42916,
                                                        117105
                                                    ],
                                                    [
                                                        1446,
                                                        77374,
                                                        8765,
                                                        104979,
                                                        -4985,
                                                        52348
                                                    ],
                                                    [
                                                        30497,
                                                        4362,
                                                        10982,
                                                        15971,
                                                        53782,
                                                        -9570
                                                    ],
                                                    [
                                                        93477,
                                                        37901,
                                                        83942,
                                                        12102,
                                                        93477,
                                                        37901
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4289405038]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 31,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_26",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [1033, 131, 80, 93],
                                            p: [
                                                [
                                                    [
                                                        76989,
                                                        31200,
                                                        76989,
                                                        31200,
                                                        85648,
                                                        54722,
                                                        1
                                                    ],
                                                    [
                                                        53233,
                                                        91686,
                                                        74991,
                                                        85482,
                                                        35250,
                                                        96597
                                                    ],
                                                    [
                                                        1281,
                                                        63769,
                                                        7276,
                                                        86516,
                                                        -4269,
                                                        43091
                                                    ],
                                                    [
                                                        25037,
                                                        3542,
                                                        9052,
                                                        13106,
                                                        44353,
                                                        -7831
                                                    ],
                                                    [
                                                        76989,
                                                        31200,
                                                        69219,
                                                        10004,
                                                        76989,
                                                        31200
                                                    ]
                                                ],
                                                [
                                                    [
                                                        76989,
                                                        31200,
                                                        76989,
                                                        31200,
                                                        85648,
                                                        54722,
                                                        1
                                                    ],
                                                    [
                                                        53233,
                                                        91686,
                                                        74991,
                                                        85482,
                                                        35250,
                                                        96597
                                                    ],
                                                    [
                                                        1281,
                                                        63769,
                                                        7276,
                                                        86516,
                                                        -4269,
                                                        43091
                                                    ],
                                                    [
                                                        25037,
                                                        3542,
                                                        9052,
                                                        13106,
                                                        44353,
                                                        -7831
                                                    ],
                                                    [
                                                        76989,
                                                        31200,
                                                        69219,
                                                        10004,
                                                        76989,
                                                        31200
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4290389367]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 20,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_15",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [209, 510, 1071, 210],
                                            p: [
                                                [
                                                    [
                                                        1071360,
                                                        73454,
                                                        1071360,
                                                        73454,
                                                        948480,
                                                        15314,
                                                        1
                                                    ],
                                                    [
                                                        621568,
                                                        0,
                                                        792064,
                                                        0,
                                                        355072,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        210240,
                                                        122880,
                                                        84615,
                                                        1071360,
                                                        210240
                                                    ],
                                                    [
                                                        1071360,
                                                        210240,
                                                        1071360,
                                                        210240,
                                                        1071360,
                                                        164645
                                                    ],
                                                    [
                                                        1071360,
                                                        73454,
                                                        1071360,
                                                        119049,
                                                        1071360,
                                                        73454
                                                    ]
                                                ],
                                                [
                                                    [
                                                        1071360,
                                                        73454,
                                                        1071360,
                                                        73454,
                                                        948480,
                                                        15314,
                                                        1
                                                    ],
                                                    [
                                                        621568,
                                                        0,
                                                        792064,
                                                        0,
                                                        355072,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        210240,
                                                        122880,
                                                        84615,
                                                        1071360,
                                                        210240
                                                    ],
                                                    [
                                                        1071360,
                                                        210240,
                                                        1071360,
                                                        210240,
                                                        1071360,
                                                        164645
                                                    ],
                                                    [
                                                        1071360,
                                                        73454,
                                                        1071360,
                                                        119049,
                                                        1071360,
                                                        73454
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4292144491]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 21,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_16",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [598, 518, 682, 202],
                                            p: [
                                                [
                                                    [
                                                        190568,
                                                        0,
                                                        190568,
                                                        0,
                                                        124807,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        0,
                                                        11989,
                                                        61004,
                                                        3996,
                                                        0,
                                                        11989
                                                    ],
                                                    [
                                                        0,
                                                        11989,
                                                        0,
                                                        11989,
                                                        36379,
                                                        7743
                                                    ],
                                                    [
                                                        564429,
                                                        202320,
                                                        356791,
                                                        -22730,
                                                        682240,
                                                        202320
                                                    ],
                                                    [
                                                        682240,
                                                        202320,
                                                        682240,
                                                        202320,
                                                        682240,
                                                        140125
                                                    ],
                                                    [
                                                        682240,
                                                        140125,
                                                        682240,
                                                        140125,
                                                        579820,
                                                        83426
                                                    ],
                                                    [
                                                        195326,
                                                        0,
                                                        425630,
                                                        4746,
                                                        193647,
                                                        0
                                                    ],
                                                    [
                                                        190568,
                                                        0,
                                                        192247,
                                                        0,
                                                        190568,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        190568,
                                                        0,
                                                        190568,
                                                        0,
                                                        124807,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        0,
                                                        11989,
                                                        61004,
                                                        3996,
                                                        0,
                                                        11989
                                                    ],
                                                    [
                                                        0,
                                                        11989,
                                                        0,
                                                        11989,
                                                        36379,
                                                        7743
                                                    ],
                                                    [
                                                        564429,
                                                        202320,
                                                        356791,
                                                        -22730,
                                                        682240,
                                                        202320
                                                    ],
                                                    [
                                                        682240,
                                                        202320,
                                                        682240,
                                                        202320,
                                                        682240,
                                                        140125
                                                    ],
                                                    [
                                                        682240,
                                                        140125,
                                                        682240,
                                                        140125,
                                                        579820,
                                                        83426
                                                    ],
                                                    [
                                                        195326,
                                                        0,
                                                        425630,
                                                        4746,
                                                        193647,
                                                        0
                                                    ],
                                                    [
                                                        190568,
                                                        0,
                                                        192247,
                                                        0,
                                                        190568,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4289781059]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 22,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_17",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 552, 1280, 168],
                                            p: [
                                                [
                                                    [
                                                        1280000,
                                                        168480,
                                                        1280000,
                                                        168480,
                                                        1280000,
                                                        58178,
                                                        1
                                                    ],
                                                    [
                                                        1280000,
                                                        58178,
                                                        1280000,
                                                        58178,
                                                        1158000,
                                                        83552
                                                    ],
                                                    [
                                                        593250,
                                                        32285,
                                                        918000,
                                                        109963,
                                                        309500,
                                                        -35295
                                                    ],
                                                    [
                                                        0,
                                                        69829,
                                                        113250,
                                                        15973,
                                                        0,
                                                        168480
                                                    ],
                                                    [
                                                        0,
                                                        168480,
                                                        0,
                                                        168480,
                                                        426667,
                                                        168480
                                                    ],
                                                    [
                                                        1280000,
                                                        168480,
                                                        853333,
                                                        168480,
                                                        1280000,
                                                        168480
                                                    ]
                                                ],
                                                [
                                                    [
                                                        1280000,
                                                        168480,
                                                        1280000,
                                                        168480,
                                                        1280000,
                                                        58178,
                                                        1
                                                    ],
                                                    [
                                                        1280000,
                                                        58178,
                                                        1280000,
                                                        58178,
                                                        1158000,
                                                        83552
                                                    ],
                                                    [
                                                        593250,
                                                        32285,
                                                        918000,
                                                        109963,
                                                        309500,
                                                        -35295
                                                    ],
                                                    [
                                                        0,
                                                        69829,
                                                        113250,
                                                        15973,
                                                        0,
                                                        168480
                                                    ],
                                                    [
                                                        0,
                                                        168480,
                                                        0,
                                                        168480,
                                                        426667,
                                                        168480
                                                    ],
                                                    [
                                                        1280000,
                                                        168480,
                                                        853333,
                                                        168480,
                                                        1280000,
                                                        168480
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4288465975]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 23,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_18",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 552, 820, 168],
                                            p: [
                                                [
                                                    [
                                                        506231,
                                                        9569,
                                                        506231,
                                                        9569,
                                                        271080,
                                                        -19936,
                                                        1
                                                    ],
                                                    [
                                                        0,
                                                        69872,
                                                        103498,
                                                        24063,
                                                        0,
                                                        168480
                                                    ],
                                                    [
                                                        0,
                                                        168480,
                                                        0,
                                                        168480,
                                                        820480,
                                                        168480
                                                    ],
                                                    [
                                                        820480,
                                                        168480,
                                                        820480,
                                                        168480,
                                                        812972,
                                                        81519
                                                    ],
                                                    [
                                                        506231,
                                                        9569,
                                                        652630,
                                                        32345,
                                                        506231,
                                                        9569
                                                    ]
                                                ],
                                                [
                                                    [
                                                        506231,
                                                        9569,
                                                        506231,
                                                        9569,
                                                        271080,
                                                        -19936,
                                                        1
                                                    ],
                                                    [
                                                        0,
                                                        69872,
                                                        103498,
                                                        24063,
                                                        0,
                                                        168480
                                                    ],
                                                    [
                                                        0,
                                                        168480,
                                                        0,
                                                        168480,
                                                        820480,
                                                        168480
                                                    ],
                                                    [
                                                        820480,
                                                        168480,
                                                        820480,
                                                        168480,
                                                        812972,
                                                        81519
                                                    ],
                                                    [
                                                        506231,
                                                        9569,
                                                        652630,
                                                        32345,
                                                        506231,
                                                        9569
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4287478070]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 24,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_19",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 561, 524, 159],
                                            p: [
                                                [
                                                    [
                                                        523520,
                                                        2374,
                                                        523520,
                                                        2374,
                                                        436375,
                                                        -2028,
                                                        1
                                                    ],
                                                    [
                                                        287677,
                                                        6286,
                                                        357652,
                                                        -71,
                                                        158741,
                                                        28539
                                                    ],
                                                    [
                                                        0,
                                                        115838,
                                                        59933,
                                                        78424,
                                                        0,
                                                        159120
                                                    ],
                                                    [
                                                        0,
                                                        159120,
                                                        0,
                                                        159120,
                                                        260140,
                                                        159120
                                                    ],
                                                    [
                                                        260140,
                                                        159120,
                                                        260140,
                                                        159120,
                                                        355061,
                                                        13867
                                                    ],
                                                    [
                                                        523520,
                                                        2374,
                                                        518985,
                                                        2618,
                                                        523520,
                                                        2374
                                                    ]
                                                ],
                                                [
                                                    [
                                                        523520,
                                                        2374,
                                                        523520,
                                                        2374,
                                                        436375,
                                                        -2028,
                                                        1
                                                    ],
                                                    [
                                                        287677,
                                                        6286,
                                                        357652,
                                                        -71,
                                                        158741,
                                                        28539
                                                    ],
                                                    [
                                                        0,
                                                        115838,
                                                        59933,
                                                        78424,
                                                        0,
                                                        159120
                                                    ],
                                                    [
                                                        0,
                                                        159120,
                                                        0,
                                                        159120,
                                                        260140,
                                                        159120
                                                    ],
                                                    [
                                                        260140,
                                                        159120,
                                                        260140,
                                                        159120,
                                                        355061,
                                                        13867
                                                    ],
                                                    [
                                                        523520,
                                                        2374,
                                                        518985,
                                                        2618,
                                                        523520,
                                                        2374
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4288465975]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 25,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_20",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [937, 576, 343, 65],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        59205,
                                                        0,
                                                        59205,
                                                        153453,
                                                        73179,
                                                        1
                                                    ],
                                                    [
                                                        343040,
                                                        36457,
                                                        270537,
                                                        59256,
                                                        343040,
                                                        9612
                                                    ],
                                                    [
                                                        343040,
                                                        0,
                                                        343040,
                                                        0,
                                                        175274,
                                                        60676
                                                    ],
                                                    [
                                                        0,
                                                        59205,
                                                        6101,
                                                        58837,
                                                        0,
                                                        59205
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        59205,
                                                        0,
                                                        59205,
                                                        153453,
                                                        73179,
                                                        1
                                                    ],
                                                    [
                                                        343040,
                                                        36457,
                                                        270537,
                                                        59256,
                                                        343040,
                                                        9612
                                                    ],
                                                    [
                                                        343040,
                                                        0,
                                                        343040,
                                                        0,
                                                        175274,
                                                        60676
                                                    ],
                                                    [
                                                        0,
                                                        59205,
                                                        6101,
                                                        58837,
                                                        0,
                                                        59205
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4287478070]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_1",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [120, 93, 1040, 257] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nActive Presenter Test</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:60px;color:#000000;text-align:center;",
                                        "bottom"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 2,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Text_2",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [120, 373, 1040, 207] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTesting Bloom&apos;s capability to host activities that &quot;own&quot; the page navigation</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:center;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 4,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_4",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [75, 611, 182, 46] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nBack out of AP</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [1, 4283745263],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [75, 611, 182, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nBack out of AP</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282885579]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [75, 611, 182, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nBack out of AP</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Pressed",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282026151]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [75, 611, 182, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nBack out of AP</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4289506476]
                                }
                            ],
                            f: 35651584,
                            e: { l: [[3, [[14, 0, 0]]]], s: -1, f: 8 },
                            uts: 0,
                            t: 0
                        }
                    ],
                    e: {
                        l: [
                            [
                                16,
                                [
                                    [
                                        42,
                                        [0, 1, 1, 1, 1],
                                        [[0, 0, 3, [true, "apReviewMode", 0]]]
                                    ],
                                    [
                                        38,
                                        ["300_7", -1],
                                        [[0, 0, 3, [true, "apReviewMode", 0]]]
                                    ]
                                ]
                            ]
                        ]
                    }
                },
                {
                    at: "Fill-in-the-blanks",
                    i: 65,
                    de: "",
                    a: true,
                    n:
                        '<p style="margin-top: 0px; margin-bottom: 0px; ">\r\nFill-in-the-blanks</p>\r\n\r\n\r\n',
                    d: 3000,
                    m: 15,
                    w: 1,
                    b: {
                        f: [
                            2,
                            0,
                            [
                                [0, 4286893730],
                                [100, 4294967295]
                            ],
                            90,
                            0,
                            100
                        ]
                    },
                    h: [720],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [1, [[200, 0, 0]]],
                                [
                                    3,
                                    [
                                        [200, 0, 0],
                                        [1000, 3000, 0]
                                    ]
                                ],
                                [11, [[200, 0, 0]]],
                                [12, [[200, 0, 0]]],
                                [10, [[200, 0, 0]]],
                                [13, [[200, 0, 0]]],
                                [4, [[200, 0, 0]]],
                                [5, [[200, 0, 0]]],
                                [7, [[200, 0, 0]]],
                                [9, [[200, 0, 0]]],
                                [42, [[200, 0, 0]]],
                                [41, [[200, 0, 0]]],
                                [43, [[200, 0, 0]]],
                                [40, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 42,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_8",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [932, 518, 348, 202],
                                            p: [
                                                [
                                                    [
                                                        311974,
                                                        0,
                                                        311974,
                                                        0,
                                                        311692,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        311128,
                                                        0,
                                                        311410,
                                                        0,
                                                        310846,
                                                        0
                                                    ],
                                                    [
                                                        310000,
                                                        0,
                                                        310564,
                                                        0,
                                                        277561,
                                                        0
                                                    ],
                                                    [
                                                        238635,
                                                        36061,
                                                        249918,
                                                        14886,
                                                        234404,
                                                        43190
                                                    ],
                                                    [
                                                        232147,
                                                        59543,
                                                        232147,
                                                        51157,
                                                        232147,
                                                        64575
                                                    ],
                                                    [
                                                        234686,
                                                        74429,
                                                        232993,
                                                        69606,
                                                        203094,
                                                        76106
                                                    ],
                                                    [
                                                        166988,
                                                        113215,
                                                        176578,
                                                        91830,
                                                        150064,
                                                        105248
                                                    ],
                                                    [
                                                        108316,
                                                        100426,
                                                        129754,
                                                        100426,
                                                        48517,
                                                        100426
                                                    ],
                                                    [
                                                        0,
                                                        180725,
                                                        0,
                                                        136487,
                                                        0,
                                                        202320
                                                    ],
                                                    [
                                                        0,
                                                        202320,
                                                        0,
                                                        202320,
                                                        347234,
                                                        202320
                                                    ],
                                                    [
                                                        347234,
                                                        202320,
                                                        347234,
                                                        202320,
                                                        347234,
                                                        180725
                                                    ],
                                                    [
                                                        347234,
                                                        180725,
                                                        347234,
                                                        180725,
                                                        347234,
                                                        115731
                                                    ],
                                                    [
                                                        347234,
                                                        115731,
                                                        347234,
                                                        115731,
                                                        350336,
                                                        114893
                                                    ],
                                                    [
                                                        347234,
                                                        113006,
                                                        344413,
                                                        114054,
                                                        347234,
                                                        6080
                                                    ],
                                                    [
                                                        347234,
                                                        6080,
                                                        347234,
                                                        6080,
                                                        336514,
                                                        2097
                                                    ],
                                                    [
                                                        311974,
                                                        0,
                                                        324668,
                                                        0,
                                                        311974,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        311974,
                                                        0,
                                                        311974,
                                                        0,
                                                        311692,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        311128,
                                                        0,
                                                        311410,
                                                        0,
                                                        310846,
                                                        0
                                                    ],
                                                    [
                                                        310000,
                                                        0,
                                                        310564,
                                                        0,
                                                        277561,
                                                        0
                                                    ],
                                                    [
                                                        238635,
                                                        36061,
                                                        249918,
                                                        14886,
                                                        234404,
                                                        43190
                                                    ],
                                                    [
                                                        232147,
                                                        59543,
                                                        232147,
                                                        51157,
                                                        232147,
                                                        64575
                                                    ],
                                                    [
                                                        234686,
                                                        74429,
                                                        232993,
                                                        69606,
                                                        203094,
                                                        76106
                                                    ],
                                                    [
                                                        166988,
                                                        113215,
                                                        176578,
                                                        91830,
                                                        150064,
                                                        105248
                                                    ],
                                                    [
                                                        108316,
                                                        100426,
                                                        129754,
                                                        100426,
                                                        48517,
                                                        100426
                                                    ],
                                                    [
                                                        0,
                                                        180725,
                                                        0,
                                                        136487,
                                                        0,
                                                        202320
                                                    ],
                                                    [
                                                        0,
                                                        202320,
                                                        0,
                                                        202320,
                                                        347234,
                                                        202320
                                                    ],
                                                    [
                                                        347234,
                                                        202320,
                                                        347234,
                                                        202320,
                                                        347234,
                                                        180725
                                                    ],
                                                    [
                                                        347234,
                                                        180725,
                                                        347234,
                                                        180725,
                                                        347234,
                                                        115731
                                                    ],
                                                    [
                                                        347234,
                                                        115731,
                                                        347234,
                                                        115731,
                                                        350336,
                                                        114893
                                                    ],
                                                    [
                                                        347234,
                                                        113006,
                                                        344413,
                                                        114054,
                                                        347234,
                                                        6080
                                                    ],
                                                    [
                                                        347234,
                                                        6080,
                                                        347234,
                                                        6080,
                                                        336514,
                                                        2097
                                                    ],
                                                    [
                                                        311974,
                                                        0,
                                                        324668,
                                                        0,
                                                        311974,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4294967295]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 41,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_7",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 487, 300, 233],
                                            p: [
                                                [
                                                    [
                                                        203594,
                                                        102292,
                                                        203594,
                                                        102292,
                                                        184608,
                                                        102292,
                                                        1
                                                    ],
                                                    [
                                                        151634,
                                                        115319,
                                                        166622,
                                                        106990,
                                                        142890,
                                                        93109
                                                    ],
                                                    [
                                                        90181,
                                                        75812,
                                                        118909,
                                                        76879,
                                                        92179,
                                                        70259
                                                    ],
                                                    [
                                                        93178,
                                                        58300,
                                                        93178,
                                                        64493,
                                                        93178,
                                                        26054
                                                    ],
                                                    [
                                                        24981,
                                                        0,
                                                        62702,
                                                        0,
                                                        15988,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        3844,
                                                        7744,
                                                        1281,
                                                        0,
                                                        87343
                                                    ],
                                                    [
                                                        0,
                                                        87343,
                                                        0,
                                                        87343,
                                                        0,
                                                        112756
                                                    ],
                                                    [
                                                        0,
                                                        112756,
                                                        0,
                                                        112756,
                                                        0,
                                                        184083
                                                    ],
                                                    [
                                                        0,
                                                        184083,
                                                        0,
                                                        184083,
                                                        0,
                                                        215689
                                                    ],
                                                    [
                                                        0,
                                                        215689,
                                                        0,
                                                        215689,
                                                        0,
                                                        232560
                                                    ],
                                                    [
                                                        0,
                                                        232560,
                                                        0,
                                                        232560,
                                                        299520,
                                                        232560
                                                    ],
                                                    [
                                                        299520,
                                                        232560,
                                                        299520,
                                                        232560,
                                                        299520,
                                                        184083
                                                    ],
                                                    [
                                                        299520,
                                                        184083,
                                                        299520,
                                                        184083,
                                                        299520,
                                                        138810
                                                    ],
                                                    [
                                                        203594,
                                                        102292,
                                                        256553,
                                                        102292,
                                                        203594,
                                                        102292
                                                    ]
                                                ],
                                                [
                                                    [
                                                        203594,
                                                        102292,
                                                        203594,
                                                        102292,
                                                        184608,
                                                        102292,
                                                        1
                                                    ],
                                                    [
                                                        151634,
                                                        115319,
                                                        166622,
                                                        106990,
                                                        142890,
                                                        93109
                                                    ],
                                                    [
                                                        90181,
                                                        75812,
                                                        118909,
                                                        76879,
                                                        92179,
                                                        70259
                                                    ],
                                                    [
                                                        93178,
                                                        58300,
                                                        93178,
                                                        64493,
                                                        93178,
                                                        26054
                                                    ],
                                                    [
                                                        24981,
                                                        0,
                                                        62702,
                                                        0,
                                                        15988,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        3844,
                                                        7744,
                                                        1281,
                                                        0,
                                                        87343
                                                    ],
                                                    [
                                                        0,
                                                        87343,
                                                        0,
                                                        87343,
                                                        0,
                                                        112756
                                                    ],
                                                    [
                                                        0,
                                                        112756,
                                                        0,
                                                        112756,
                                                        0,
                                                        184083
                                                    ],
                                                    [
                                                        0,
                                                        184083,
                                                        0,
                                                        184083,
                                                        0,
                                                        215689
                                                    ],
                                                    [
                                                        0,
                                                        215689,
                                                        0,
                                                        215689,
                                                        0,
                                                        232560
                                                    ],
                                                    [
                                                        0,
                                                        232560,
                                                        0,
                                                        232560,
                                                        299520,
                                                        232560
                                                    ],
                                                    [
                                                        299520,
                                                        232560,
                                                        299520,
                                                        232560,
                                                        299520,
                                                        184083
                                                    ],
                                                    [
                                                        299520,
                                                        184083,
                                                        299520,
                                                        184083,
                                                        299520,
                                                        138810
                                                    ],
                                                    [
                                                        203594,
                                                        102292,
                                                        256553,
                                                        102292,
                                                        203594,
                                                        102292
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4294967295]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 43,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_9",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [753, 640, 527, 80],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        79920,
                                                        90296,
                                                        34859,
                                                        259736,
                                                        79920
                                                    ],
                                                    [
                                                        527360,
                                                        79916,
                                                        527360,
                                                        79916,
                                                        527142,
                                                        54950
                                                    ],
                                                    [
                                                        526704,
                                                        5020,
                                                        526923,
                                                        29985,
                                                        336389,
                                                        -16389,
                                                        2
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        79920,
                                                        90296,
                                                        34859,
                                                        259736,
                                                        79920
                                                    ],
                                                    [
                                                        527360,
                                                        79916,
                                                        527360,
                                                        79916,
                                                        527142,
                                                        54950
                                                    ],
                                                    [
                                                        526704,
                                                        5020,
                                                        526923,
                                                        29985,
                                                        336389,
                                                        -16389,
                                                        2
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4292144491]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 40,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_6",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 620, 932, 100],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        1
                                                    ],
                                                    [
                                                        931840,
                                                        100080,
                                                        423291,
                                                        -56455,
                                                        0,
                                                        100080
                                                    ],
                                                    [
                                                        0,
                                                        100080,
                                                        0,
                                                        100080,
                                                        0,
                                                        72525
                                                    ],
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        44970,
                                                        0,
                                                        17415
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        1
                                                    ],
                                                    [
                                                        931840,
                                                        100080,
                                                        423291,
                                                        -56455,
                                                        0,
                                                        100080
                                                    ],
                                                    [
                                                        0,
                                                        100080,
                                                        0,
                                                        100080,
                                                        0,
                                                        72525
                                                    ],
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        44970,
                                                        0,
                                                        17415
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4288465975]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_1",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [60, 59, 1146, 86] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nIn this picture of the Oregon coast, what animal inhabits the low-lying rock in the middle of the picture?</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:32px;color:#000000;text-align:left;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 3,
                            m: 15,
                            k: 21,
                            cc: [
                                {
                                    i: 11,
                                    m: 15,
                                    r: "65_11",
                                    k: 18,
                                    rs: true,
                                    c: 6,
                                    n: "Radio Button_11",
                                    ti: 0,
                                    f: 35651584,
                                    s: [
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ],
                                            d: 1,
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCormorants</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 0,
                                            p: 0,
                                            n: "Normal",
                                            r: 0,
                                            f: null
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCormorants</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 1,
                                            p: 4,
                                            n: "Hover",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCormorants</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 2,
                                            p: 2,
                                            n: "Pressed",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCormorants</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 3,
                                            p: 8,
                                            n: "Disabled",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCormorants</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 4,
                                            p: 16,
                                            n: "Normal Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCormorants</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 5,
                                            p: 20,
                                            n: "Hover Checked",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCormorants</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 6,
                                            p: 18,
                                            n: "Pressed Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nCormorants</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 7,
                                            p: 24,
                                            n: "Disabled Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        }
                                    ],
                                    e: { s: -1 },
                                    uts: 1
                                },
                                {
                                    i: 12,
                                    m: 15,
                                    r: "65_12",
                                    k: 18,
                                    rs: true,
                                    c: 6,
                                    n: "Radio Button_12",
                                    ti: 0,
                                    f: 35651584,
                                    s: [
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "16403%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ],
                                            d: 1,
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nGuinea Fowl</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 0,
                                            p: 0,
                                            n: "Normal",
                                            r: 0,
                                            f: null
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "16403%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nGuinea Fowl</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 1,
                                            p: 4,
                                            n: "Hover",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "16403%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nGuinea Fowl</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 2,
                                            p: 2,
                                            n: "Pressed",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "16403%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nGuinea Fowl</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 3,
                                            p: 8,
                                            n: "Disabled",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "16403%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nGuinea Fowl</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 4,
                                            p: 16,
                                            n: "Normal Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "16403%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nGuinea Fowl</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 5,
                                            p: 20,
                                            n: "Hover Checked",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "16403%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nGuinea Fowl</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 6,
                                            p: 18,
                                            n: "Pressed Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "16403%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nGuinea Fowl</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 7,
                                            p: 24,
                                            n: "Disabled Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        }
                                    ],
                                    e: { s: -1 },
                                    uts: 1
                                },
                                {
                                    i: 10,
                                    m: 15,
                                    r: "65_10",
                                    k: 18,
                                    rs: true,
                                    c: 6,
                                    n: "Radio Button_10",
                                    ti: 0,
                                    f: 35651584,
                                    s: [
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "32806%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSealions</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 0,
                                            p: 0,
                                            n: "Normal",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "32806%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSealions</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 1,
                                            p: 4,
                                            n: "Hover",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "32806%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSealions</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 2,
                                            p: 2,
                                            n: "Pressed",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "32806%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSealions</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 3,
                                            p: 8,
                                            n: "Disabled",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "32806%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ],
                                            d: 1,
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSealions</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 4,
                                            p: 16,
                                            n: "Normal Checked",
                                            r: 0,
                                            f: null
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "32806%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSealions</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 5,
                                            p: 20,
                                            n: "Hover Checked",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "32806%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSealions</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 6,
                                            p: 18,
                                            n: "Pressed Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "32806%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSealions</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 7,
                                            p: 24,
                                            n: "Disabled Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        }
                                    ],
                                    e: { s: -1 },
                                    uts: 1
                                },
                                {
                                    i: 13,
                                    m: 15,
                                    r: "65_13",
                                    k: 18,
                                    rs: true,
                                    c: 6,
                                    n: "Radio Button_13",
                                    ti: 0,
                                    f: 35651584,
                                    s: [
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "49210%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ],
                                            d: 1,
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPelicans</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 0,
                                            p: 0,
                                            n: "Normal",
                                            r: 0,
                                            f: null
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "49210%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPelicans</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 1,
                                            p: 4,
                                            n: "Hover",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "49210%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPelicans</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 2,
                                            p: 2,
                                            n: "Pressed",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "49210%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPelicans</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 3,
                                            p: 8,
                                            n: "Disabled",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "49210%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPelicans</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 4,
                                            p: 16,
                                            n: "Normal Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "49210%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPelicans</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 5,
                                            p: 20,
                                            n: "Hover Checked",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "49210%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPelicans</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 6,
                                            p: 18,
                                            n: "Pressed Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "49210%",
                                                        "100000%",
                                                        "14422%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPelicans</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 7,
                                            p: 24,
                                            n: "Disabled Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        }
                                    ],
                                    e: { s: -1 },
                                    uts: 1
                                }
                            ],
                            r: "65_3",
                            n: "Multiple Choice Question_3",
                            ti: 1,
                            s: [
                                {
                                    w: [{ r: [57, 174, 583, 252] }],
                                    d: 1,
                                    t: [""],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35676160,
                            e: {
                                l: [
                                    [23, [[38, ["300_1", -1, 1], 0]]],
                                    [
                                        24,
                                        [
                                            [
                                                38,
                                                ["300_2", -1, 1],
                                                [[0, 3, 3, [-1]]]
                                            ],
                                            [
                                                38,
                                                ["300_3", -1, 1],
                                                [[0, 3, 5, [-1]]]
                                            ]
                                        ]
                                    ],
                                    [26, [[38, ["300_5", -1, 1], 0]]],
                                    [27, [[38, ["300_6", -1, 1], 0]]]
                                ],
                                m: 1,
                                v: [10],
                                s: -2,
                                f: 1,
                                a: 1
                            },
                            uts: 0,
                            t: 1
                        },
                        {
                            i: 4,
                            m: 15,
                            k: 2,
                            rs: true,
                            n: "Media_4",
                            e: { s: -1, f: 8 },
                            ti: 2,
                            s: [
                                {
                                    w: [{ r: [663, 145, 557, 417] }],
                                    im: [10000, 255, "jpg"],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:22px;color:#000000;text-align:left;",
                                        "default"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 169893888,
                            uts: 1
                        },
                        {
                            i: 5,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_5",
                            ti: 3,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [566, 612, 120, 46] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSubmit</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [566, 612, 120, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSubmit</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [566, 612, 120, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSubmit</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [566, 612, 120, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSubmit</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35676160,
                            e: { l: [[3, [[19, 0, 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 7,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_7",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [1051, 612, 169, 46] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nNext AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [1, 4283745263],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [1051, 612, 169, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nNext AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282885579]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [1051, 612, 169, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nNext AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Pressed",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282026151]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [1051, 612, 169, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nNext AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4289506476]
                                }
                            ],
                            f: 35651584,
                            e: { l: [[3, [[7, 1, 0]]]], s: -1, f: 8 },
                            uts: 0,
                            t: 0
                        },
                        {
                            i: 9,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_9",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [60, 612, 209, 46] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [1, 4283745263],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [60, 612, 209, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282885579]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [60, 612, 209, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Pressed",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282026151]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [60, 612, 209, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4289506476]
                                }
                            ],
                            f: 35651584,
                            e: { l: [[3, [[8, 1, 0]]]], s: -1, f: 8 },
                            uts: 0,
                            t: 0
                        }
                    ],
                    e: {
                        l: [
                            [
                                16,
                                [
                                    [
                                        42,
                                        [0, 1, 1, 1, 1],
                                        [[0, 0, 3, [true, "apReviewMode", 0]]]
                                    ],
                                    [
                                        38,
                                        ["300_7", -1],
                                        [[0, 0, 3, [true, "apReviewMode", 0]]]
                                    ]
                                ]
                            ]
                        ]
                    }
                },
                {
                    at: "Most-fun",
                    i: 66,
                    de: "",
                    a: false,
                    n:
                        '<p style="margin-top: 0px; margin-bottom: 0px; ">\r\nMost-fun</p>\r\n\r\n\r\n',
                    d: 3000,
                    m: 15,
                    w: 1,
                    b: {
                        f: [
                            2,
                            0,
                            [
                                [0, 4286893730],
                                [100, 4294967295]
                            ],
                            90,
                            0,
                            100
                        ]
                    },
                    h: [720],
                    tl: [
                        [
                            0,
                            "Main Timeline",
                            [
                                [3, [[200, 0, 0]]],
                                [
                                    1,
                                    [
                                        [200, 0, 0],
                                        [1000, 3000, 0]
                                    ]
                                ],
                                [4, [[200, 0, 0]]],
                                [5, [[200, 0, 0]]],
                                [7, [[200, 0, 0]]],
                                [6, [[200, 0, 0]]],
                                [2, [[200, 0, 0]]],
                                [9, [[200, 0, 0]]],
                                [11, [[200, 0, 0]]],
                                [42, [[200, 0, 0]]],
                                [41, [[200, 0, 0]]],
                                [43, [[200, 0, 0]]],
                                [40, [[200, 0, 0]]]
                            ]
                        ]
                    ],
                    cc: [
                        {
                            i: 42,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_8",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [932, 518, 348, 202],
                                            p: [
                                                [
                                                    [
                                                        311974,
                                                        0,
                                                        311974,
                                                        0,
                                                        311692,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        311128,
                                                        0,
                                                        311410,
                                                        0,
                                                        310846,
                                                        0
                                                    ],
                                                    [
                                                        310000,
                                                        0,
                                                        310564,
                                                        0,
                                                        277561,
                                                        0
                                                    ],
                                                    [
                                                        238635,
                                                        36061,
                                                        249918,
                                                        14886,
                                                        234404,
                                                        43190
                                                    ],
                                                    [
                                                        232147,
                                                        59543,
                                                        232147,
                                                        51157,
                                                        232147,
                                                        64575
                                                    ],
                                                    [
                                                        234686,
                                                        74429,
                                                        232993,
                                                        69606,
                                                        203094,
                                                        76106
                                                    ],
                                                    [
                                                        166988,
                                                        113215,
                                                        176578,
                                                        91830,
                                                        150064,
                                                        105248
                                                    ],
                                                    [
                                                        108316,
                                                        100426,
                                                        129754,
                                                        100426,
                                                        48517,
                                                        100426
                                                    ],
                                                    [
                                                        0,
                                                        180725,
                                                        0,
                                                        136487,
                                                        0,
                                                        202320
                                                    ],
                                                    [
                                                        0,
                                                        202320,
                                                        0,
                                                        202320,
                                                        347234,
                                                        202320
                                                    ],
                                                    [
                                                        347234,
                                                        202320,
                                                        347234,
                                                        202320,
                                                        347234,
                                                        180725
                                                    ],
                                                    [
                                                        347234,
                                                        180725,
                                                        347234,
                                                        180725,
                                                        347234,
                                                        115731
                                                    ],
                                                    [
                                                        347234,
                                                        115731,
                                                        347234,
                                                        115731,
                                                        350336,
                                                        114893
                                                    ],
                                                    [
                                                        347234,
                                                        113006,
                                                        344413,
                                                        114054,
                                                        347234,
                                                        6080
                                                    ],
                                                    [
                                                        347234,
                                                        6080,
                                                        347234,
                                                        6080,
                                                        336514,
                                                        2097
                                                    ],
                                                    [
                                                        311974,
                                                        0,
                                                        324668,
                                                        0,
                                                        311974,
                                                        0
                                                    ]
                                                ],
                                                [
                                                    [
                                                        311974,
                                                        0,
                                                        311974,
                                                        0,
                                                        311692,
                                                        0,
                                                        1
                                                    ],
                                                    [
                                                        311128,
                                                        0,
                                                        311410,
                                                        0,
                                                        310846,
                                                        0
                                                    ],
                                                    [
                                                        310000,
                                                        0,
                                                        310564,
                                                        0,
                                                        277561,
                                                        0
                                                    ],
                                                    [
                                                        238635,
                                                        36061,
                                                        249918,
                                                        14886,
                                                        234404,
                                                        43190
                                                    ],
                                                    [
                                                        232147,
                                                        59543,
                                                        232147,
                                                        51157,
                                                        232147,
                                                        64575
                                                    ],
                                                    [
                                                        234686,
                                                        74429,
                                                        232993,
                                                        69606,
                                                        203094,
                                                        76106
                                                    ],
                                                    [
                                                        166988,
                                                        113215,
                                                        176578,
                                                        91830,
                                                        150064,
                                                        105248
                                                    ],
                                                    [
                                                        108316,
                                                        100426,
                                                        129754,
                                                        100426,
                                                        48517,
                                                        100426
                                                    ],
                                                    [
                                                        0,
                                                        180725,
                                                        0,
                                                        136487,
                                                        0,
                                                        202320
                                                    ],
                                                    [
                                                        0,
                                                        202320,
                                                        0,
                                                        202320,
                                                        347234,
                                                        202320
                                                    ],
                                                    [
                                                        347234,
                                                        202320,
                                                        347234,
                                                        202320,
                                                        347234,
                                                        180725
                                                    ],
                                                    [
                                                        347234,
                                                        180725,
                                                        347234,
                                                        180725,
                                                        347234,
                                                        115731
                                                    ],
                                                    [
                                                        347234,
                                                        115731,
                                                        347234,
                                                        115731,
                                                        350336,
                                                        114893
                                                    ],
                                                    [
                                                        347234,
                                                        113006,
                                                        344413,
                                                        114054,
                                                        347234,
                                                        6080
                                                    ],
                                                    [
                                                        347234,
                                                        6080,
                                                        347234,
                                                        6080,
                                                        336514,
                                                        2097
                                                    ],
                                                    [
                                                        311974,
                                                        0,
                                                        324668,
                                                        0,
                                                        311974,
                                                        0
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4294967295]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 41,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_7",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 487, 300, 233],
                                            p: [
                                                [
                                                    [
                                                        203594,
                                                        102292,
                                                        203594,
                                                        102292,
                                                        184608,
                                                        102292,
                                                        1
                                                    ],
                                                    [
                                                        151634,
                                                        115319,
                                                        166622,
                                                        106990,
                                                        142890,
                                                        93109
                                                    ],
                                                    [
                                                        90181,
                                                        75812,
                                                        118909,
                                                        76879,
                                                        92179,
                                                        70259
                                                    ],
                                                    [
                                                        93178,
                                                        58300,
                                                        93178,
                                                        64493,
                                                        93178,
                                                        26054
                                                    ],
                                                    [
                                                        24981,
                                                        0,
                                                        62702,
                                                        0,
                                                        15988,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        3844,
                                                        7744,
                                                        1281,
                                                        0,
                                                        87343
                                                    ],
                                                    [
                                                        0,
                                                        87343,
                                                        0,
                                                        87343,
                                                        0,
                                                        112756
                                                    ],
                                                    [
                                                        0,
                                                        112756,
                                                        0,
                                                        112756,
                                                        0,
                                                        184083
                                                    ],
                                                    [
                                                        0,
                                                        184083,
                                                        0,
                                                        184083,
                                                        0,
                                                        215689
                                                    ],
                                                    [
                                                        0,
                                                        215689,
                                                        0,
                                                        215689,
                                                        0,
                                                        232560
                                                    ],
                                                    [
                                                        0,
                                                        232560,
                                                        0,
                                                        232560,
                                                        299520,
                                                        232560
                                                    ],
                                                    [
                                                        299520,
                                                        232560,
                                                        299520,
                                                        232560,
                                                        299520,
                                                        184083
                                                    ],
                                                    [
                                                        299520,
                                                        184083,
                                                        299520,
                                                        184083,
                                                        299520,
                                                        138810
                                                    ],
                                                    [
                                                        203594,
                                                        102292,
                                                        256553,
                                                        102292,
                                                        203594,
                                                        102292
                                                    ]
                                                ],
                                                [
                                                    [
                                                        203594,
                                                        102292,
                                                        203594,
                                                        102292,
                                                        184608,
                                                        102292,
                                                        1
                                                    ],
                                                    [
                                                        151634,
                                                        115319,
                                                        166622,
                                                        106990,
                                                        142890,
                                                        93109
                                                    ],
                                                    [
                                                        90181,
                                                        75812,
                                                        118909,
                                                        76879,
                                                        92179,
                                                        70259
                                                    ],
                                                    [
                                                        93178,
                                                        58300,
                                                        93178,
                                                        64493,
                                                        93178,
                                                        26054
                                                    ],
                                                    [
                                                        24981,
                                                        0,
                                                        62702,
                                                        0,
                                                        15988,
                                                        0
                                                    ],
                                                    [
                                                        0,
                                                        3844,
                                                        7744,
                                                        1281,
                                                        0,
                                                        87343
                                                    ],
                                                    [
                                                        0,
                                                        87343,
                                                        0,
                                                        87343,
                                                        0,
                                                        112756
                                                    ],
                                                    [
                                                        0,
                                                        112756,
                                                        0,
                                                        112756,
                                                        0,
                                                        184083
                                                    ],
                                                    [
                                                        0,
                                                        184083,
                                                        0,
                                                        184083,
                                                        0,
                                                        215689
                                                    ],
                                                    [
                                                        0,
                                                        215689,
                                                        0,
                                                        215689,
                                                        0,
                                                        232560
                                                    ],
                                                    [
                                                        0,
                                                        232560,
                                                        0,
                                                        232560,
                                                        299520,
                                                        232560
                                                    ],
                                                    [
                                                        299520,
                                                        232560,
                                                        299520,
                                                        232560,
                                                        299520,
                                                        184083
                                                    ],
                                                    [
                                                        299520,
                                                        184083,
                                                        299520,
                                                        184083,
                                                        299520,
                                                        138810
                                                    ],
                                                    [
                                                        203594,
                                                        102292,
                                                        256553,
                                                        102292,
                                                        203594,
                                                        102292
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4294967295]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 43,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_9",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [753, 640, 527, 80],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        79920,
                                                        90296,
                                                        34859,
                                                        259736,
                                                        79920
                                                    ],
                                                    [
                                                        527360,
                                                        79916,
                                                        527360,
                                                        79916,
                                                        527142,
                                                        54950
                                                    ],
                                                    [
                                                        526704,
                                                        5020,
                                                        526923,
                                                        29985,
                                                        336389,
                                                        -16389,
                                                        2
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        79920,
                                                        90296,
                                                        34859,
                                                        259736,
                                                        79920
                                                    ],
                                                    [
                                                        527360,
                                                        79916,
                                                        527360,
                                                        79916,
                                                        527142,
                                                        54950
                                                    ],
                                                    [
                                                        526704,
                                                        5020,
                                                        526923,
                                                        29985,
                                                        336389,
                                                        -16389,
                                                        2
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4292144491]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 40,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Freeform_6",
                            ti: -1,
                            tm: [10, 5, 10, 0],
                            s: [
                                {
                                    w: [
                                        {
                                            r: [0, 620, 932, 100],
                                            p: [
                                                [
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        1
                                                    ],
                                                    [
                                                        931840,
                                                        100080,
                                                        423291,
                                                        -56455,
                                                        0,
                                                        100080
                                                    ],
                                                    [
                                                        0,
                                                        100080,
                                                        0,
                                                        100080,
                                                        0,
                                                        72525
                                                    ],
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        44970,
                                                        0,
                                                        17415
                                                    ]
                                                ],
                                                [
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        0,
                                                        17415,
                                                        1
                                                    ],
                                                    [
                                                        931840,
                                                        100080,
                                                        423291,
                                                        -56455,
                                                        0,
                                                        100080
                                                    ],
                                                    [
                                                        0,
                                                        100080,
                                                        0,
                                                        100080,
                                                        0,
                                                        72525
                                                    ],
                                                    [
                                                        0,
                                                        17415,
                                                        0,
                                                        44970,
                                                        0,
                                                        17415
                                                    ]
                                                ]
                                            ]
                                        }
                                    ],
                                    d: 1,
                                    t: [
                                        "",
                                        "font-family:'Georgia';font-size:24px;color:#000000;text-align:left;",
                                        "top"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [587],
                                    r: 0,
                                    f: [1, 4288465975]
                                }
                            ],
                            f: 35651584,
                            e: { s: -1 },
                            uts: 1,
                            t: 17
                        },
                        {
                            i: 3,
                            m: 15,
                            k: 0,
                            rs: true,
                            n: "Title_3",
                            e: { s: -1 },
                            ti: -1,
                            s: [
                                {
                                    w: [{ r: [60, 46, 1160, 56] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWhat was the most fun about the Oregon coast?</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:32px;color:#000000;text-align:left;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    a: [0],
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35683328,
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 1,
                            m: 15,
                            k: 21,
                            cc: [
                                {
                                    i: 4,
                                    m: 15,
                                    r: "66_4",
                                    k: 18,
                                    rs: true,
                                    c: 6,
                                    n: "Radio Button_4",
                                    ti: 0,
                                    f: 35651584,
                                    s: [
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ],
                                            d: 1,
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTraveling with our friends</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 0,
                                            p: 0,
                                            n: "Normal",
                                            r: 0,
                                            f: null
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTraveling with our friends</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 1,
                                            p: 4,
                                            n: "Hover",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTraveling with our friends</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 2,
                                            p: 2,
                                            n: "Pressed",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTraveling with our friends</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 3,
                                            p: 8,
                                            n: "Disabled",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTraveling with our friends</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 4,
                                            p: 16,
                                            n: "Normal Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTraveling with our friends</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 5,
                                            p: 20,
                                            n: "Hover Checked",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTraveling with our friends</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 6,
                                            p: 18,
                                            n: "Pressed Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "0%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nTraveling with our friends</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 7,
                                            p: 24,
                                            n: "Disabled Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        }
                                    ],
                                    e: { s: -1 },
                                    uts: 1
                                },
                                {
                                    i: 5,
                                    m: 15,
                                    r: "66_5",
                                    k: 18,
                                    rs: true,
                                    c: 6,
                                    n: "Radio Button_5",
                                    ti: 0,
                                    f: 35651584,
                                    s: [
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "9104%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ],
                                            d: 1,
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSeeing the little touristy towns along the way</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 0,
                                            p: 0,
                                            n: "Normal",
                                            r: 0,
                                            f: null
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "9104%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSeeing the little touristy towns along the way</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 1,
                                            p: 4,
                                            n: "Hover",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "9104%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSeeing the little touristy towns along the way</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 2,
                                            p: 2,
                                            n: "Pressed",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "9104%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSeeing the little touristy towns along the way</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 3,
                                            p: 8,
                                            n: "Disabled",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "9104%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSeeing the little touristy towns along the way</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 4,
                                            p: 16,
                                            n: "Normal Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "9104%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSeeing the little touristy towns along the way</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 5,
                                            p: 20,
                                            n: "Hover Checked",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "9104%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSeeing the little touristy towns along the way</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 6,
                                            p: 18,
                                            n: "Pressed Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "9104%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSeeing the little touristy towns along the way</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 7,
                                            p: 24,
                                            n: "Disabled Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        }
                                    ],
                                    e: { s: -1 },
                                    uts: 1
                                },
                                {
                                    i: 7,
                                    m: 15,
                                    r: "66_7",
                                    k: 18,
                                    rs: true,
                                    c: 6,
                                    n: "Radio Button_7",
                                    ti: 0,
                                    f: 35651584,
                                    s: [
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "18207%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nEating cupcakes at the bakery</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 0,
                                            p: 0,
                                            n: "Normal",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "18207%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nEating cupcakes at the bakery</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 1,
                                            p: 4,
                                            n: "Hover",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "18207%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nEating cupcakes at the bakery</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 2,
                                            p: 2,
                                            n: "Pressed",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "18207%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nEating cupcakes at the bakery</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 3,
                                            p: 8,
                                            n: "Disabled",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "18207%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ],
                                            d: 1,
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nEating cupcakes at the bakery</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 4,
                                            p: 16,
                                            n: "Normal Checked",
                                            r: 0,
                                            f: null
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "18207%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nEating cupcakes at the bakery</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 5,
                                            p: 20,
                                            n: "Hover Checked",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "18207%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nEating cupcakes at the bakery</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 6,
                                            p: 18,
                                            n: "Pressed Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "18207%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nEating cupcakes at the bakery</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 7,
                                            p: 24,
                                            n: "Disabled Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        }
                                    ],
                                    e: { s: -1 },
                                    uts: 1
                                },
                                {
                                    i: 6,
                                    m: 15,
                                    r: "66_6",
                                    k: 18,
                                    rs: true,
                                    c: 6,
                                    n: "Radio Button_6",
                                    ti: 0,
                                    f: 35651584,
                                    s: [
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "27311%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ],
                                            d: 1,
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWatching and listening to the waves crash on the shore</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 0,
                                            p: 0,
                                            n: "Normal",
                                            r: 0,
                                            f: null
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "27311%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWatching and listening to the waves crash on the shore</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 1,
                                            p: 4,
                                            n: "Hover",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "27311%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWatching and listening to the waves crash on the shore</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 2,
                                            p: 2,
                                            n: "Pressed",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "27311%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWatching and listening to the waves crash on the shore</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 3,
                                            p: 8,
                                            n: "Disabled",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "27311%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWatching and listening to the waves crash on the shore</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 4,
                                            p: 16,
                                            n: "Normal Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4282668138,
                                                4283745263,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "27311%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWatching and listening to the waves crash on the shore</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 5,
                                            p: 20,
                                            n: "Hover Checked",
                                            r: 0,
                                            f: [1, 1356657659],
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4292670459,
                                                4281548623,
                                                4282356403,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "27311%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWatching and listening to the waves crash on the shore</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#000000;text-align:left;",
                                                "middle"
                                            ],
                                            i: 6,
                                            p: 18,
                                            n: "Pressed Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                2,
                                                4290439160,
                                                4280429109,
                                                4280967543,
                                                1
                                            ]
                                        },
                                        {
                                            w: [
                                                {
                                                    r: [
                                                        "0%",
                                                        "27311%",
                                                        "100000%",
                                                        "8004%"
                                                    ]
                                                }
                                            ],
                                            t: [
                                                '<p style="text-align:left;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nWatching and listening to the waves crash on the shore</p>\r\n\r\n\r\n',
                                                "font-family:'Georgia';font-size:22px;font-weight:normal;color:#969696;text-align:left;",
                                                "middle"
                                            ],
                                            i: 7,
                                            p: 24,
                                            n: "Disabled Checked",
                                            r: 0,
                                            f: null,
                                            tg: [
                                                16,
                                                1,
                                                1,
                                                4294967295,
                                                4289506476,
                                                4289506476,
                                                1
                                            ]
                                        }
                                    ],
                                    e: { s: -1 },
                                    uts: 1
                                }
                            ],
                            r: "66_1",
                            n: "Multiple Choice Question_1",
                            ti: 1,
                            s: [
                                {
                                    w: [{ r: [60, 103, 1160, 455] }],
                                    d: 1,
                                    t: [""],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: null
                                }
                            ],
                            f: 35676160,
                            e: {
                                l: [
                                    [23, [[38, ["300_1", -1, 1], 0]]],
                                    [
                                        24,
                                        [
                                            [
                                                38,
                                                ["300_2", -1, 1],
                                                [[0, 3, 3, [-1]]]
                                            ],
                                            [
                                                38,
                                                ["300_3", -1, 1],
                                                [[0, 3, 5, [-1]]]
                                            ]
                                        ]
                                    ],
                                    [26, [[38, ["300_5", -1, 1], 0]]],
                                    [27, [[38, ["300_6", -1, 1], 0]]]
                                ],
                                m: 1,
                                v: [7],
                                s: -2,
                                f: 1,
                                a: 1
                            },
                            uts: 0,
                            t: 1
                        },
                        {
                            i: 2,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_2",
                            ti: 2,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [580, 612, 120, 46] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSubmit</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4285976562],
                                            [100, 4282621119]
                                        ],
                                        90,
                                        0,
                                        100
                                    ],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [580, 612, 120, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSubmit</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4284270319],
                                            [100, 4281761435]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [580, 612, 120, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSubmit</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Clicked",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [
                                        2,
                                        0,
                                        [
                                            [0, 4283150295],
                                            [100, 4280967543]
                                        ],
                                        90,
                                        0,
                                        100
                                    ]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [580, 612, 120, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nSubmit</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:18px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4286611584]
                                }
                            ],
                            f: 35683328,
                            e: { l: [[3, [[19, 0, 0]]]], s: -1, f: 8 },
                            uts: 1,
                            t: 0
                        },
                        {
                            i: 9,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Next_button",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [1112, 612, 108, 46] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nExit AP</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [1, 4283745263],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [1112, 612, 108, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nExit AP</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282885579]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [1112, 612, 108, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nExit AP</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Pressed",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282026151]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [1112, 612, 108, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nExit AP</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4289506476]
                                }
                            ],
                            f: 35651584,
                            e: { l: [[3, [[14, 1, 0]]]], s: -1, f: 8 },
                            uts: 0,
                            t: 0
                        },
                        {
                            i: 11,
                            m: 15,
                            k: 10,
                            rs: true,
                            c: 6,
                            n: "Button_11",
                            ti: 0,
                            s: [
                                {
                                    l: [1, 4282885579, 321],
                                    w: [{ r: [60, 613, 197, 46] }],
                                    d: 1,
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 0,
                                    p: 0,
                                    n: "Normal",
                                    r: 0,
                                    f: [1, 4283745263],
                                    a: [1, [220]]
                                },
                                {
                                    l: [1, 4282026151, 321],
                                    w: [{ r: [60, 613, 197, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 1,
                                    p: 4,
                                    n: "Hover",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282885579]
                                },
                                {
                                    l: [1, 4281232259, 321],
                                    w: [{ r: [60, 613, 197, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#FFFFFF;text-align:center;",
                                        "middle"
                                    ],
                                    i: 2,
                                    p: 2,
                                    n: "Pressed",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4282026151]
                                },
                                {
                                    l: [1, 4286611584, 321],
                                    w: [{ r: [60, 613, 197, 46] }],
                                    t: [
                                        '<p style="text-align:center;line-height: 1.20; margin-top: 0px; margin-bottom: 0px; ">\r\nPrevious AP Slide</p>\r\n\r\n\r\n',
                                        "font-family:'Georgia';font-size:22px;color:#969696;text-align:center;",
                                        "middle"
                                    ],
                                    i: 3,
                                    p: 8,
                                    n: "Disabled",
                                    a: [1, [220]],
                                    r: 0,
                                    f: [1, 4289506476]
                                }
                            ],
                            f: 35651584,
                            e: { l: [[3, [[8, 1, 0]]]], s: -1, f: 8 },
                            uts: 0,
                            t: 0
                        }
                    ],
                    e: {
                        l: [
                            [
                                16,
                                [
                                    [
                                        42,
                                        [0, 1, 1, 1, 1],
                                        [[0, 0, 3, [true, "apReviewMode", 0]]]
                                    ],
                                    [
                                        38,
                                        ["300_7", -1],
                                        [[0, 0, 3, [true, "apReviewMode", 0]]]
                                    ]
                                ]
                            ]
                        ]
                    }
                }
            ],
            textDir: "ltr",
            hasEquation: false
        },
        f = [
            function(e, prez) {
                window.parent.postMessage(
                    '{"messageType":"control","controlAction":"navigate-to-previous-page"}',
                    "*"
                );
            },
            function(e, prez) {
                window.parent.postMessage(
                    '{"messageType":"control","controlAction":"navigate-to-next-page"}',
                    "*"
                );
            }
        ];
    d.f = f;
    d.playerIcons = {
        pause:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><rect x="12" y="8" width="4" height="13"/><rect x="20" y="8" width="4" height="13"/></svg>',
        restart:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><path d="M22,18c1.103,0,2-0.897,2-2v-5c0-1.103-0.897-2-2-2h-7c-1.103,0-2,0.897-2,2v3h-2v-3c0-2.206,1.794-4,4-4h7\tc2.206,0,4,1.794,4,4v5c0,2.206-1.794,4-4,4h-3v2l-4-3l4-3v2H22z"/></svg>',
        cchide:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><path d="M17,21h-3c-2.205,0-4-1.794-4-4v-6c0-2.205,1.795-4,4-4h3v2h-3c-1.104,0-2,0.896-2,2v6c0,1.103,0.896,2,2,2h3V21z"/><path d="M26,21h-3c-2.205,0-4-1.794-4-4v-6c0-2.205,1.795-4,4-4h3v2h-3c-1.104,0-2,0.896-2,2v6c0,1.103,0.896,2,2,2h3V21z"/><rect x="10" y="13" width="16" height="2"/></svg>',
        last:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polyline points="12,7 12,22 21,16 21,22 24,22 24,7 21,7 21,13 "/></svg>',
        exit:
            '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">  <g>    <rect x="15" y="8" width="2" height="16" transform="translate(-6.63 16) rotate(-45)"/>    <rect x="8" y="15" width="16" height="2" transform="translate(-6.63 16) rotate(-45)"/>  </g></svg>',
        next:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polygon points="18,22 26,14.5 18,7 18,12 12,7 12,22 18,17 "/></svg>',
        speed20:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><circle cx="18" cy="19" r="2"/><path d="M18,7.5c5.592,0,10.259,4.014,11.285,9.31l0.892-0.594C28.906,10.661,23.935,6.5,18,6.5\t\tc-5.877,0-10.807,4.082-12.135,9.557l0.957,0.288C8.025,11.281,12.574,7.5,18,7.5z"/><polygon points="18.347,19.133 18.054,18.292 25.625,16.057 25.963,16.81 "/></svg>',
        first:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polyline points="24,7 24,22 15,16 15,22 12,22 12,7 15,7 15,13 "/></svg>',
        mute:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" enable-background="new 0 0 36 28" xml:space="preserve"><polygon points="14,17 18,21 18,7 14,11 11,11 11,17 "/><path d="M20.687,18.5l-0.707-0.707c1.015-1.014,1.573-2.36,1.573-3.793c0-1.432-0.559-2.78-1.573-3.794l0.707-0.707\tc1.203,1.204,1.866,2.802,1.866,4.501S21.89,17.298,20.687,18.5z"/><path d="M22.854,20.854l-0.707-0.707c1.644-1.643,2.549-3.826,2.549-6.147s-0.905-4.503-2.549-6.146l0.707-0.707\tc1.832,1.831,2.842,4.265,2.842,6.853S24.687,19.022,22.854,20.854z"/></svg>',
        prev:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polygon points="18,22 10,14.5 18,7 18,12 24,7 24,22 18,17 "/></svg>',
        about:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><rect x="16" y="12" width="4" height="10"/><path d="M20,8c0,1.105-0.672,2-1.5,2h-1C16.671,10,16,9.105,16,8l0,0c0-1.105,0.671-2,1.5-2h1C19.328,6,20,6.895,20,8L20,8z"/></svg>',
        speed05:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><circle cx="18" cy="19" r="2"/><polygon points="17.675,19.38 11,14 12,13 18.325,18.62 "/><path d="M18,7.5c5.592,0,10.259,4.014,11.285,9.31l0.892-0.594C28.906,10.661,23.935,6.5,18,6.5\t\tc-5.877,0-10.807,4.082-12.135,9.557l0.957,0.288C8.025,11.281,12.574,7.5,18,7.5z"/></svg>',
        play:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polygon points="12,22 12,7 25,14.5 "/></svg>',
        autofit:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polyline points="12,9.414 15.293,12.707 16.707,11.293 13.414,8 13,8 16,8 16,6 10,6 10,12 12,12 12,9 "/><polyline points="23.854,9.414 20.487,12.707 19.037,11.293 22.293,8 22.707,8 20,8 20,6 26,6 26,12 24,12 24,9 "/><polyline points="12,18.439 15.293,15.073 16.707,16.598 13.414,20 13,20 16,20 16,22 10,22 10,16 12,16 12,19 "/><polyline points="23.854,18.439 20.487,15.073 19.037,16.598 22.293,20 22.707,20 20,20 20,22 26,22 26,16 24,16 24,19 "/></svg>',
        speed10:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><circle cx="18" cy="19" r="2"/><path d="M18,7.5c5.592,0,10.259,4.014,11.285,9.31l0.892-0.594C28.906,10.661,23.935,6.5,18,6.5\t\tc-5.877,0-10.807,4.082-12.135,9.557l0.957,0.288C8.025,11.281,12.574,7.5,18,7.5z"/><polygon points="18.542,19 17.583,19 17.25,11 18.054,11 "/></svg>',
        closemenu:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="16px" height="16px" viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve"><polygon points="7,8 11,4 11,2 5,8 11,14 11,12 "/></svg>',
        check:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="16px" height="16px" viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve"><polygon points="14,3 15,4 6,13 1,8 2,7 6,11 "/></svg>',
        speed15:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><circle cx="18" cy="19" r="2"/><path d="M18,7.5c5.592,0,10.259,4.014,11.285,9.31l0.892-0.594C28.906,10.661,23.935,6.5,18,6.5\t\tc-5.877,0-10.807,4.082-12.135,9.557l0.957,0.288C8.025,11.281,12.574,7.5,18,7.5z"/><polygon points="18.542,19 18.054,18.292 23.333,13.375 23.917,14 "/></svg>',
        sound:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polygon points="15,17 19,21 19,7 15,11 12,11 12,17 "/><rect x="19.757" y="13.5" transform="matrix(0.7071 0.7071 -0.7071 0.7071 16.9289 -12.8701)" width="8.485" height="1"/><rect x="23.5" y="9.757" transform="matrix(0.7071 0.7071 -0.7071 0.7071 16.9289 -12.8701)" width="1" height="8.485"/></svg>',
        ccshow:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><path d="M17,21h-3c-2.205,0-4-1.794-4-4v-6c0-2.205,1.795-4,4-4h3v2h-3c-1.104,0-2,0.896-2,2v6c0,1.103,0.896,2,2,2h3V21z"/><path d="M26,21h-3c-2.205,0-4-1.794-4-4v-6c0-2.205,1.795-4,4-4h3v2h-3c-1.104,0-2,0.896-2,2v6c0,1.103,0.896,2,2,2h3V21z"/></svg>',
        sidebarshow:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><path d="M10,6v14h16V6H10z M24,18h-6V8h6V18z"/></svg>',
        sidebarhide:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><path d="M10,6v14h16V6H10z M17,18h-5V8h5V18z M24,18h-5V8h5V18z"/></svg>',
        fullscreen:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polygon points="12,8 16,8 16,6 10,6 10,12 12,12 "/><polygon points="24,8 24,12 26,12 26,6 20,6 20,8 "/><polygon points="24,20 20,20 20,22 26,22 26,16 24,16 "/><polygon points="12,20 12,16 10,16 10,22 16,22 16,20 "/></svg>',
        actualsize:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polyline points="14.854,18.598 11.487,21.982 10.037,20.43 13.293,17 13.707,17 10,17 10,15 17,15 17,22 15,22 15,18 "/><polyline points="14.854,9.439 11.487,6.073 10.037,7.598 13.293,11 13.707,11 10,11 10,13 17,13 17,6 15,6 15,10 "/><polyline points="21.165,18.598 24.541,21.982 25.995,20.43 22.744,17 22.33,17 26,17 26,15 19,15 19,22 21,22 21,18 "/><polyline points="21.165,9.439 24.541,6.073 25.995,7.598 22.744,11 22.33,11 26,11 26,13 19,13 19,6 21,6 21,10 "/></svg>',
        correctvalues:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="18px" height="18px" viewBox="0 0 18 18" enable-background="new 0 0 18 18" xml:space="preserve"><g>\t<defs>\t\t<rect id="SVGID_1_" width="18" height="18"/>\t</defs>\t<clipPath id="SVGID_2_">\t\t<use xlink:href="#SVGID_1_"  overflow="visible"/>\t</clipPath>\t<path clip-path="url(#SVGID_2_)" fill="#F05A28" d="M17,13H3.5C2.671,13,2,12.328,2,11.5v-8C2,2.671,2.671,2,3.5,2H17V13z"/>\t<polygon clip-path="url(#SVGID_2_)" fill="#B23E1F" points="14,16 14,13 17,13 \t"/>\t<rect x="5" y="5" clip-path="url(#SVGID_2_)" fill="#FFFFFF" width="9" height="1"/>\t<rect x="5" y="7" clip-path="url(#SVGID_2_)" fill="#FFFFFF" width="9" height="1"/>\t<rect x="5" y="9" clip-path="url(#SVGID_2_)" fill="#FFFFFF" width="9" height="1"/></g></svg>',
        setting:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><path d="M24,13h1.912c-0.174-1.388-0.694-2.74-1.597-3.901l-1.365,1.365L21.536,9.05l1.365-1.365C21.74,6.782,20.388,6.262,19,6.087\tV8h-2V6.087c-1.388,0.174-2.741,0.695-3.901,1.598l1.365,1.365l-1.414,1.414l-1.365-1.365c-0.903,1.161-1.423,2.513-1.598,3.901H12\tv2h-1.913c0.175,1.388,0.695,2.74,1.598,3.9l1.365-1.365l1.414,1.414l-1.365,1.365c1.161,0.903,2.514,1.423,3.901,1.598V20h2v1.912\tc1.388-0.175,2.74-0.694,3.901-1.598l-1.365-1.365l1.414-1.414l1.365,1.365c0.902-1.16,1.423-2.513,1.597-3.9H24V13z M20.121,16.121\tc-1.171,1.172-3.071,1.172-4.243,0c-1.171-1.171-1.171-3.071,0-4.243c1.172-1.172,3.072-1.171,4.243,0\tC21.293,13.051,21.293,14.949,20.121,16.121z"/></svg>',
        tochide:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><rect x="15" y="6" width="11" height="2"/><rect x="15" y="18" width="11" height="2"/><rect x="15" y="12" width="11" height="2"/><circle cx="11.5" cy="7.5" r="1.5"/><circle cx="11.5" cy="13" r="1.5"/><circle cx="11.5" cy="18.5" r="1.5"/><rect x="19" y="3.292" transform="matrix(0.8242 0.5664 -0.5664 0.8242 10.7917 -8.7581)" width="1" height="19.416"/></svg>',
        tocshow:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><rect x="15" y="6" width="11" height="2"/><rect x="15" y="18" width="11" height="2"/><rect x="15" y="12" width="11" height="2"/><circle cx="11.5" cy="7.5" r="1.5"/><circle cx="11.5" cy="13" r="1.5"/><circle cx="11.5" cy="18.5" r="1.5"/></svg>',
        resources:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="36px" height="28px" viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><polygon points="20.155,12.416 10.496,9.827 17.845,5.584 27.504,8.173 "/><polygon points="20.155,17.415 10.496,14.827 14.43,13.231 20.031,14.594 24.042,12.271 27.504,13.173 "/><polygon points="20.155,22.415 10.496,19.827 15,18 20.031,19.5 23.976,17.254 27.504,18.173 "/></svg>',
        correct:
            '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">  <g id="Layer_1-2" data-name="Layer 1-2">    <path d="M7,14.5a.99676.99676,0,0,1-.707-.293l-5-5A.99989.99989,0,0,1,2.707,7.793L7,12.08594l8.293-8.293A.99989.99989,0,0,1,16.707,5.207l-9,9A.99676.99676,0,0,1,7,14.5Z" fill="#2fae62"/>  </g></svg>',
        incorrect:
            '<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">  <path d="M3,16a1,1,0,0,1-.707-1.707l12-12A.99989.99989,0,0,1,15.707,3.707l-12,12A.99676.99676,0,0,1,3,16Z" fill="#d15327"/>  <path d="M15,16a.99676.99676,0,0,1-.707-.293l-12-12A.99989.99989,0,0,1,3.707,2.293l12,12A1,1,0,0,1,15,16Z" fill="#d15327"/></svg>',
        closepane:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="16px" height="16px" viewBox="0 0 16 16" enable-background="new 0 0 16 16" xml:space="preserve"><polygon points="8,9 4,5 2,5 8,11 14,5 12,5 "/></svg>',
        current:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="16px" height="16px" viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve"><polygon points="14,8 8,2 8,5 2,5 2,11 8,11 8,14 "/></svg>',
        expanded:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="16px" height="16px" viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve"><polygon points="2,6 14,6 8,12 "/></svg>',
        collapsed:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="16px" height="16px" viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve"><polygon points="6,14 6,2 12,8 "/></svg>',
        completed:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="16px" height="16px" viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve"><polygon points="12,3 6,11 3,8 1,10 6,15 16,2 "/></svg>',
        openmenu:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t width="16px" height="16px" viewBox="0 0 16 16" style="enable-background:new 0 0 16 16;" xml:space="preserve"><polygon points="9,8 5,4 5,2 11,8 5,14 5,12 "/></svg>',
        rightarrow:
            '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\t viewBox="0 0 36 28" style="enable-background:new 0 0 36 28;" xml:space="preserve"><path d="M19.5,14c0,0.1-0.1,0.3-0.2,0.4l-7.2,7.2c-0.1,0.1-0.2,0.2-0.4,0.2s-0.3-0.1-0.4-0.2l-0.8-0.8c-0.1-0.1-0.2-0.2-0.2-0.4\ts0.1-0.3,0.2-0.4l6.1-6.1l-6.1-6.1c-0.1-0.1-0.2-0.2-0.2-0.4s0.1-0.3,0.2-0.4l0.8-0.8c0.1-0.1,0.2-0.2,0.4-0.2s0.3,0.1,0.4,0.2\tl7.2,7.2C19.5,13.7,19.5,13.9,19.5,14z M25.5,14c0,0.1-0.1,0.3-0.2,0.4l-7.2,7.2c-0.1,0.1-0.2,0.2-0.4,0.2c-0.1,0-0.3-0.1-0.4-0.2\tl-0.8-0.8c-0.1-0.1-0.2-0.2-0.2-0.4s0.1-0.3,0.2-0.4l6.1-6.1l-6.1-6.1c-0.1-0.1-0.2-0.2-0.2-0.4s0.1-0.3,0.2-0.4l0.8-0.8\tc0.1-0.1,0.2-0.2,0.4-0.2c0.1,0,0.3,0.1,0.4,0.2l7.2,7.2C25.4,13.7,25.5,13.9,25.5,14z"/></svg>'
    };
    d.playerLayouts = {
        topbar:
            '<div class="ap-toolbar-top ap-toolbar" role="toolbar" tabindex="0">    <div class="ap-tool-projectname"></div>    <div class="ap-button ap-tool-resources" data-has-label="true"></div></div>',
        bottombar:
            '<div class="ap-toolbar ap-toolbar-bottom" role="toolbar" tabindex="0">\t<div class="ap-button ap-tool-restart" data-priority=15 ></div>\t<div class="ap-button ap-tool-first" data-priority=4 ></div>\t<div class="ap-button ap-tool-prev" data-priority=6></div>\t<div class="ap-button ap-tool-play" data-priority=8></div>\t<div class="ap-button ap-tool-next" data-priority=7></div>\t<div class="ap-button ap-tool-last" data-priority=5></div>\t<div class="ap-button ap-tool-speed" data-priority=3></div>\t<div class="ap-label ap-tool-position" data-priority=9>00:00</div>\t<div class="ap-slider ap-tool-progress" style="flex-grow: 1;" data-priority=14></div>\t<div class="ap-label ap-tool-duration" data-priority=9>00:00</div>\t<div class="ap-button ap-tool-sound" data-priority=12></div>\t<div class="ap-slider ap-tool-volume" data-priority=13></div>\t<div class="ap-button ap-tool-cc" data-priority=2></div>\t<div class="ap-button ap-tool-about" data-priority=1></div>\t<div class="ap-button ap-tool-setting" data-priority=20></div>\t<div class="ap-button ap-tool-displaymode" data-priority=1></div>\t<div class="ap-button ap-tool-toc" data-priority=10></div>\t<div class="ap-button ap-tool-sidebar" data-priority=10></div>\t<div class="ap-button ap-tool-exit" data-priority=16 ></div></div>',
        sidebar:
            '<div class="ap-side-bar">\t<div class="ap-company-logo"></div>\t<div class="ap-presenter-info"></div>\t<div class="ap-toc-container ap-no-select"></div>\t<div class="ap-resources-container"></div></div><div class="ap-side-bar-expand"></div>'
    };
    d.mediaPreloading = true;
    d.ignoreScormEntryStatus = false;
    d.playbackRates = [0.5, 1.0, 1.5, 2.0];
    d.showResumeLessonConfirmation = false;

    /* xAPI configuration */
    // ActivityID that is sent for the statement's object
    d.xAPICourseId = "";
    // Course name for the activity
    d.xAPICourseName = { "en-US": "" };
    // Course description for the activity
    d.xAPICourseDescription = { "en-US": "" };
    // Pre-configured LRSes that should receive data, added to what is included
    // in the URL and/or passed to the constructor function.
    //
    // An array of objects where each object may have the following properties:
    //
    //    endpoint: (including trailing slash '/')
    //    auth:
    //    allowFail: (boolean, default true)
    //    version: (string, defaults to high version supported by TinCanJS)
    d.xAPIRecordStores = [];

    AP.loadedPrezs.push(d);
})(AtomiAP);
