Implementation details and workflows
====================================

To achieve using separate databases for each channel and be able to switch channels dynamically, the following data structure and utility functions have been implemented.

ContentDBRoutingMiddleware
--------------------------

This middleware will be applied to every request, and will dynamically select a database based on the channel_id.
If a channel ID was included in the URL, it will ensure the appropriate content DB is used for the duration of the request. (Note: `set_active_content_database` is thread-local, so this shouldn't interfere with other parallel requests.)

For example, this is how the client side dynamically requests data from a specific channel:

    >>> localhost:8000/api/content/<channel_1_id>/contentnode

this will respond with all the contentnode data stored in database <channel_1_id>.sqlite3

    >>> localhost:8000/api/content/<channel_2_id>/contentnode

this will respond with all the contentnode data stored in database <channel_2_id>.sqlite3

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


 * `django-mptt's MPTTModel <http://django-mptt.github.io/django-mptt/overview.html/>`__ allows for efficient traversal and querying of the ContentNode tree.
 * ``ContentDatabaseModel`` is used as a marker so that the content_db_router knows to query against the content database only if the model inherits from ContentDatabaseModel.

The tree structure is established by the ``parent`` field that is a foreign key pointing to another ContentNode object. You can also create a symmetric relationship using the ``related`` field, or an asymmetric field using the ``is_prerequisite`` field.

File
----

The ``File`` model also inherits from ``ContentDatabaseModel``.

To find where the source file is located, the class method ``get_url`` uses the ``checksum`` field and ``settings.CONTENT_STORAGE_DIR`` to calculate the file path. Every source file is named based on its MD5 hash value (this value is also stored in the ``checksum`` field) and stored in a namespaced folder under the directory specified in ``settings.CONTENT_STORAGE_DIR``. Because it's likely to have thousands of content files, and some filesystems cannot handle a flat folder with a large number of files very well, we create namespaced subfolders to improve the performance. So the eventual file path would look something like:

``[CONTENT_STORAGE_DIR]/content/storage/9/8/9808fa7c560b9801acccf0f6cf74c3ea.mp4``


Content constants
-----------------

A Python module that stores constants for the ``kind`` field in ContentNode model and the ``preset`` field and ``extension`` field in File model.

.. automodule:: le_utils.constants.content_kinds
.. automodule:: le_utils.constants.file_formats
.. automodule:: le_utils.constants.format_presets

Workflows
---------

There are two workflows that handle content navigation and content rendering:

- Content navigation

    1. Start with a ContentNode object.
    2. Get the associated File object that has the ``thumbnail`` field being True.
    3. Get the thumbnail image by calling this File's ``get_url`` method.
    4. Determine the template using the ``kind`` field of this ContentNode object.
    5. Renders the template with the thumbnail image.


- Content rendering

    1. Start with a ContentNode object.
    2. Retrieve a queryset of associated File objects that are filtered by the preset.
    3. Use the ``thumbnail`` field as a filter on this queryset to get the File object and call this File object's ``get_url`` method to get the source file (the thumbnail image)
    4. Use the ``supplementary`` field as a filter on this queryset to get the "supplementary" File objects, such as caption (subtitle), and call these File objects' ``get_url`` method to get the source files.
    5. Use the ``supplementary`` field as a filter on this queryset to get the essential File object. Call its ``get_url`` method to get the source file and use its ``extension`` field to choose the content player.
    6. Play the content.
