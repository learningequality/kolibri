from django.contrib import admin

from .models import PrerequisiteContentRelationship, RelatedContentRelationship


class PrerequisiteRelationshipInlineTarget(admin.TabularInline):
    model = PrerequisiteContentRelationship
    fk_name = 'target_node'
    max = 20
    extra = 0

class PrerequisiteRelationshipInlinePrerequisite(admin.TabularInline):
    model = PrerequisiteContentRelationship
    fk_name = 'prerequisite'
    max = 20
    extra = 0

class RelatedRelationshipInline1(admin.TabularInline):
    model = RelatedContentRelationship
    fk_name = 'contentnode_1'
    max = 20
    extra = 0

class RelatedRelationshipInline2(admin.TabularInline):
    model = RelatedContentRelationship
    fk_name = 'contentnode_2'
    max = 20
    extra = 0

class ContentNodeAdmin(admin.ModelAdmin):
    inlines = (PrerequisiteRelationshipInlineTarget, PrerequisiteRelationshipInlinePrerequisite, RelatedRelationshipInline1, RelatedRelationshipInline2)
