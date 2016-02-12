Frontend Code
=============

The behavior of much of Kolibri's user interface is defined by Javascript code.

Layout of Frontend Code
-----------------------

All frontend files (Javascript, Stylus, images, templates) should be committed in the relevant 'assets/src' folder of the
app/plugin they are associated with.

Kolibri uses a Component based file structure for organizing frontend assets in the 'assets/src' folder.

As such for a particular component of a frontend plugin, would appear in the assets/src folder like this::

    /src/
        search/
             search_model.js
             search_box_view.js
             search_list_view.js
             search_list_item_view.js
             search_box.handlebars
             search_list.handlebars
             search_list_item.handlebars
             search_bg.png
             search.styl
        content_search_plugin.js

As can be seen above, plugins are defined in the root directory of the 'assets/src' folder. These are then referenced
in the `bundle.ini` file in the base directory of the plugin. An example `bundle.ini` is shown here::

    [content_search]
    entry_file = assets/src/content_search_plugin.js

Writing Frontend Plugins
------------------------

API TBD.

Frontend Tech Stack
-------------------

TBD. Asset pipelining is done using Webpack - this allows the use of require to import modules - as such all written
code should be highly modular, individual files should be responsible for exporting a single function or object.

Frontend Unit Testing
---------------------

Unit testing is carried out using `Mocha <https://mochajs.org/>`_. All Javascript code should have unit tests for all
object methods and functions.

Tests are written in Javascript, and placed in the 'assets/test' folder. An example test is shown below::

    var assert = require('assert');

    var SearchModel = require('../src/search/search_model.js');

    describe('SearchModel', function() {
        describe('default result', function() {
            it('should be empty an empty array', function () {
                var test_model = new SearchModel();
                assert.deepEqual(test_model.get("result"), []);
            });
        });
    });
