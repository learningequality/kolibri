from django.contrib import admin

from .models import PrerequisiteContentRelationship, RelatedContentRelationship


class PrerequisiteRelationshipInline1(admin.TabularInline):
    model = PrerequisiteContentRelationship
    fk_name = 'contentmetadata_1'
    max = 20
    extra = 0

class PrerequisiteRelationshipInline2(admin.TabularInline):
    model = PrerequisiteContentRelationship
    fk_name = 'contentmetadata_2'
    max = 20
    extra = 0

class RelatedRelationshipInline1(admin.TabularInline):
    model = RelatedContentRelationship
    fk_name = 'contentmetadata_1'
    max = 20
    extra = 0

class RelatedRelationshipInline2(admin.TabularInline):
    model = RelatedContentRelationship
    fk_name = 'contentmetadata_2'
    max = 20
    extra = 0

class ContentMetadataAdmin(admin.ModelAdmin):
    inlines = (PrerequisiteRelationshipInline1, PrerequisiteRelationshipInline2, RelatedRelationshipInline1, RelatedRelationshipInline2)
