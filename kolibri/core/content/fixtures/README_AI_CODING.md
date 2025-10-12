# AI and Coding Professional Skills Resources

This fixture provides sample content for AI and modern coding education resources, properly categorized under "Professional Skills" in Kolibri.

## What's Included

The `ai_coding_resources.json` fixture contains:

1. **Channel**: "AI and Coding Professional Skills" - A dedicated channel for professional development in AI and coding
2. **Content Nodes**: Six educational resources covering:
   - Introduction to Artificial Intelligence (Document)
   - Machine Learning Basics (Video)
   - Python Programming Fundamentals (Document)
   - Data Science with Python (Video)
   - AI Ethics and Responsible AI (Document)
   - Modern Web Development (Video)

## Features

- **Offline-Ready**: All resources are designed to be downloadable for offline use through Kolibri's existing download functionality
- **Professional Skills Category**: Resources are properly categorized under "professionalSkills" for easy discovery
- **Mixed Media**: Includes both document-based (PDF-style) and video content for varied learning styles
- **Duration Estimates**: Each resource includes estimated duration to help learners plan their time
- **Open Licenses**: All content uses Creative Commons licenses (CC BY or CC BY-SA) for free use and distribution

## Loading the Fixture

To load this fixture into your Kolibri development environment:

```bash
python manage.py loaddata ai_coding_resources
```

## Integration with Existing Lessons

These resources can be:
1. **Added to Lessons**: Teachers/coaches can include these resources in their lesson plans
2. **Downloaded for Offline Use**: Learners can download individual resources or the entire channel for offline access
3. **Tracked for Progress**: All standard Kolibri progress tracking works with these resources
4. **Assigned to Learners**: Can be assigned to classrooms or individual learners like any other Kolibri content

## Extending with Real Content

This fixture provides the structure for AI and coding resources. To add actual content:

1. **Use Kolibri Studio**: Create content in [Kolibri Studio](https://studio.learningequality.org/) with:
   - Upload PDF files for document resources
   - Upload MP4 video files for video resources
   - Set category to "Professional Skills"
   - Add appropriate tags (ai, machine-learning, programming, etc.)

2. **Import the Channel**: Once published in Studio, import the channel into Kolibri using:
   ```bash
   kolibri manage importchannel network <channel-id>
   kolibri manage importcontent network <channel-id>
   ```

## Popular Free AI/Coding Resources to Consider

When creating real content, consider these free resources:

### AI & Machine Learning
- Google's Machine Learning Crash Course
- fast.ai Practical Deep Learning courses
- Microsoft AI School materials
- Elements of AI (University of Helsinki)

### Programming & Coding
- FreeCodeCamp curriculum
- The Odin Project
- CS50 course materials (Harvard)
- Python tutorials from Real Python

### Data Science
- DataCamp community content
- Kaggle Learn courses
- Google's Data Analytics courses

## Notes

- All resources should include appropriate copyright information
- Ensure licenses permit offline distribution
- Consider adding subtitles/captions for accessibility
- Test offline functionality before deploying to learners
