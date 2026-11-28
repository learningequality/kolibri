from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0049_localfile_upstream_url"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="contentnode",
            index=models.Index(
                fields=["tree_id", "lang", "lft"],
                condition=models.Q(available=True),
                name="contentnode_tree_lang_lft_idx",
            ),
        ),
    ]
