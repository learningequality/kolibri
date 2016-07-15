Implementation Details and Workflows
====================================

To achieve using separated database for each channel and being able to switch channel dynamically, the following date structure and utility functions have been implemented.

ContentDBRoutingMiddleware
--------------------------

This middleware will get used on every request sent to content app, and every response content app sends out.
If a channel ID was included in the URL, It will ensure the appropriate content DB is used for the duration of the request. (Note: `set_active_content_database` is thread-local, so this shouldn't interfere with other parallel requests.)

For example, this is how the client side dynamically request data from different channels:

    >>> localhost:8000/api/content/<channel_1_id>/contentnode

this will response with all the contentnode data stored in database channel_1_id.sqlite3

    >>> localhost:8000/api/content/<channel_2_id>/contentnode

this will response with all the contentnode data stored in database channel_2_id.sqlite3

get_active_content_database
---------------------------

A utility function to retrieve the temporary thread-local variable that `using_content_database` sets

set_active_content_database
---------------------------

A utility function to set the temporary thread-local variable

using_content_database
----------------------

A decorator and context manager to do queries on a specific content DB.

Usage as a context manager:

    .. code-block:: python

        from models import ContentNode

        with using_content_database("nalanda"):
            objects = ContentNode.objects.all()
            return objects.count()

Usage as a decorator:

    .. code-block:: python

        from models import ContentNode

        @using_content_database('nalanda')
        def delete_all_the_nalanda_content():
            ContentNode.objects.all().delete()

ContentDBRouter
---------------

A router that decides what content database to read from based on a thread-local variable.

ContentNode
-----------

``ContentNode`` is implemented as a Django model that inherits from two abstract classes, MPTTModel and ContentDatabaseModel. 
`django-mptt's MPTTModel <http://django-mptt.github.io/django-mptt/>`_, which
allows for efficient traversal and querying of the ContentNode tree.
``ContentDatabaseModel`` is used as a marker so that the content_db_router knows to query against the content database only if the model inherits the ContentDatabaseModel.

The tree structure is established by the `parent` field that is a foreign key pointing to another ContentNode ojbect. You can also create a symmetric relationship using the `related` field, or an asymmetric field using the `is_prerequisite` field.

File
----

The ``File`` model also inherits from ``ContentDatabaseModel``.

To find where the source file is located, the class method ``get_url`` uses the ``checksum`` filed and ``settings.CONTENT_SOURCE_DIR`` to calculate the file path. Every source file is named based on its MD5 hash value(this value is also stored in the ``checksum`` field) and stored in namespaced folder under the directory specified in ``settings.CONTENT_SOURCE_DIR``. Because it's likely to have thousands of source files, some file system cannot handle flat folder with large number of files very well, we create namespaced subfolder to imporve the performance. So the eventual file path can look something like:

    ``user/desktop/my_learning_material/98/9808fa7c560b9801acccf0f6cf74c3ea.mp4``

As you can see, it is fine to store your source files outside of the kolibri project folder as long as you set the ``settings.CONTENT_SOURCE_DIR`` accordingly.

The front-end will then use the ``extension`` field to decide which content player should be used. When the ``supplementary`` field's value is ``True``, that means this File object isn't necessary and can display the content without it. For example, we will mark caption(subtitle) file as supplementary.

Content Constants
-----------------

A Python module that stores constants for the ``kind`` field in ContentNode model and the ``preset`` field and ``extension`` field in File model.

.. automodule:: kolibri.content.constants.content_kinds
.. automodule:: kolibri.content.constants.extensions
.. automodule:: kolibri.content.constants.presets

Workflows
---------

There are two workflows we currently designed to handle content UI rendering and content playback rendering

- Content UI Rendering

1. Start with a ContentNode object.
2. Get the associated File object that has the ``thumbnail`` field being True.
3. Get the thumbnail image by calling this File's ``get_url`` method.
4. Determine the template using the ``kind`` field of this ContentNode object.
5. Renders the template with the thumbnail image.


- Content Playback Rendering

1. Start with a ContentNode object.
2. Select a preset constant based on this object's ``kind`` field.
3. Use the preset constant to retrieve the queryset of all the File objects that have foreign key to this ContentNode object.
4. Use the ``thumbnail`` field as a filter on this queryset to get the File object and use this File object's ``checksum`` field to get the source file(the thumbnail image)
5. Use the ``supplementary`` field as a filter on this queryset to get the "supplementary" File objects, such as caption(subtitle), and call these File objects' ``get_url`` method to get the source files
6. Use the ``supplementary`` field as a filter on this queryset to get the essential File object. Use its ``checksum`` field to get the source file and use its ``extension`` field to choose the content player.
7. Play the content.
