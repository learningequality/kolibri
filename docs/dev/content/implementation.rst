Implementation Details and Workflows
====================================

ContentNode
-----------

``ContentNode`` is implemented as a Django model that inherits from two abstract classes, MPTTModel and AbstractContent. 
`django-mptt's MPTTModel <http://django-mptt.github.io/django-mptt/>`_, which
allows for efficient traversal and querying of the ContentNode tree.
``AbstractContent`` implements its custom model Manager that enables query on different database based on the database name. Because in Kolibri, each channel has its own database file that stores its ContentNode tree structure. To query a sepcific channel, you can type something like::

    >>> ContentNode.objects.using("your_database_name").all()

The above command will return a queryset of all ContentNode objects within `your_database_name.sqlite` file, which location is specified by ``settings.CONTENT_DB_DIR``. You can also use MPTTModel's built-in methods with the ``using(...)`` method to query specific database. For example::

    >>> ContentNode.get_ancestors().filter(kind="topic").using("your_database_name")

To support new a content kind, you start with defining a `kind` constant at ``kolibri/content/constants/content_kinds.py``. Currently we use Django choices to provide all the supporting content kinds for the `kind` field.

The tree structure is established by the `parent` field that is a foreign key pointing to another ContentNode ojbect. You can also create a symmetric relationship using the `is_related` field, or an asymmetric field using the `prerequisite` field. More details about these two fields can be found below in ``PrerequisiteContentRelationship`` and ``RelatedContentRelationship``.

File
----

The ``File`` model also inherits from ``AbstractContent``, so we need to provide the database name when query it::

    >>> File.objects.using("your_database_name").filter(contentndoe=root)

Above command will return all the File objects associated with the ContendNode root in the database your_database_name.sqlite.

But sometimes a content may support different quality or resolution to fit into different screen sizes. In this case, there are different File object bundles for each quality. To query a specific File bundle, we can use the ``preset`` field, like so::

    >>> File.objects.using("your_database_name").filter(contentnode=c1, preset=presets.VIDEO_HIGH_RES)

This command will return a queryset of File objects related to ContentNode c1 that support high resolution video. It will contain a video file, maybe a caption(subtitle) file and a thumbnail file. ``presets.VIDEO_HIGH_RES`` is a constant defined in ``kolibri/content/constants/presets.py``

To find where the source file is located, use the ``checksum`` filed and ``settings.CONTENT_SOURCE_DIR`` to calculate the file path. Every source file is renamed based on its MD5 hash value(this value is also stored in the ``checksum`` field) and moved to a namespaced folder under the directory specified in ``settings.CONTENT_SOURCE_DIR``. Because it's likely to have thousands of source files, some file system cannot handle flat folder with large number of files very well, we create namespaced subfolder to imporve the performance. So the eventual file path can look something like:

    ``user/desktop/my_learning_material/98/9808fa7c560b9801acccf0f6cf74c3ea.mp4``

As you can see, it is fine to store your source files outside of the kolibri project folder as long as you set the ``settings.CONTENT_SOURCE_DIR`` accordingly.

The front-end will then use the ``extension`` field to decide which content player should be used. When the ``supplementary`` field's value is ``True``, that means this File object isn't necessary and can display the content without it. For example, we will mark caption(subtitle) file as supplementary.

RelatedContentRelationship
--------------------------

A Django through model for the ``is_related`` ManyToManyField in ContentNode that defines the symmetric relationship between two ContentNode objects. Normally, Django Model does not support symmetric ManyToMany relationship. But we implement this model in a way so that it behaves like symmetric relationship. For example, you can do something like::

    >>> RelatedContentRelationship.objects.using("your_database_name").create(contentmetadata_1=c1, contentmetadata_2=c2)
    >>> RelatedContentRelationship.objects.using("your_database_name").create(contentmetadata_1=c3, contentmetadata_2=c1)
    >>> c1.is_related.all()
    [<contnetnode c2>, <contentnode c3>]
    >>> c2.is_related.all()
    [<contnetnode c1>]
    >>> c3.is_related.all()
    [<contnetnode c1>]

Notice that assigning c1 to ``contentmetadata_1`` or ``contentmetadata_2`` doesn't make any differences, which manifests the symmetric relationship.
This model also prohibits self referencing::

    >>> RelatedContentRelationship.objects.using("your_database_name").create(contentmetadata_1=c1, contentmetadata_2=c1)
    IntegrityError:: 'Cannot self reference as related.'

And handle immediate cyclic for you by silently cancel the save method call::

    >>> RelatedContentRelationship.objects.using("your_database_name").create(contentmetadata_1=c1, contentmetadata_2=c2)
    >>> RelatedContentRelationship.objects.using("your_database_name").create(contentmetadata_1=c2, contentmetadata_2=c1)

The second command will not creat a new RelatedContentRelationship object.

PrerequisiteContentRelationship
-------------------------------

A Django through model for the ``prerequisite`` ManyToManyField in ContentNode that defines the asymmetric relationship between two ContentNode objects. It will not allow self reference and immediate cyclic. So the following commands will throw an IntegrityError::

    >>> PrerequisiteContentRelationship.objects.using("your_database_name").create(target=c1, prerequisite=c1)
    IntegrityError:: 'Cannot self reference as prerequisite.'

    >>> PrerequisiteContentRelationship.objects.using("your_database_name").create(target=c1, prerequisite=c2)
    >>> PrerequisiteContentRelationship.objects.using("your_database_name").create(target=c2, prerequisite=c1)
    IntegrityError:: 'Note: Prerequisite relationship is directional! c1 and c2 cannot be prerequisite of each other!'

However, disallowing distant cyclic hasn't been implemented yet. So the following commands will take effect in the database, but you don't want this to happen::

    >>> PrerequisiteContentRelationship.objects.using("your_database_name").create(target=c1, prerequisite=c2)
    >>> PrerequisiteContentRelationship.objects.using("your_database_name").create(target=c2, prerequisite=c3)
    >>> PrerequisiteContentRelationship.objects.using("your_database_name").create(target=c3, prerequisite=c1)

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
3. Get the thumbnail image using this File's ``checksum`` field.
4. Determine the template using the ``kind`` field of this ContentNode object.
5. Renders the template with the thumbnail image.


- Content Playback Rendering

1. Start with a ContentNode object.
2. Select a preset constant based on this object's ``kind`` field.
3. Use the preset constant to retrieve the queryset of all the File objects that have foreign key to this ContentNode object.
4. Use the ``thumbnail`` field as a filter on this queryset to get the File object and use this File object's ``checksum`` field to get the source file(the thumbnail image)
5. Use the ``supplementary`` field as a filter on this queryset to get the "supplementary" File objects, such as caption(subtitle), and use these File objects' ``checksum`` field to get the source files
6. Use the ``supplementary`` field as a filter on this queryset to get the essential File object. Use its ``checksum`` field to get the source file and use its ``extension`` field to choose the content player.
7. Play the content.
