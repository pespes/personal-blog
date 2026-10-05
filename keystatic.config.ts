import { config, fields, collection, singleton } from '@keystatic/core';
import { SITE } from "./src/config";

// Fields shared by blog posts and case studies. `imageDir` is the folder
// (under src/assets/images/) that editor-uploaded images are saved to.
const postFields = (imageDir: string) => ({
  title: fields.slug({ name: { label: 'Title' } }),
  author: fields.text({
    label: 'Author',
    defaultValue: SITE.author,
  }),
  pubDatetime: fields.datetime({
    label: 'Publish Date',
    defaultValue: new Date().toISOString(),
    validation: { isRequired: true }
  }),
  modDatetime: fields.datetime({
    label: 'Modified Date',
  }),
  featured: fields.checkbox({
    label: 'Featured Post',
    defaultValue: false,
  }),
  draft: fields.checkbox({
    label: 'Draft',
    defaultValue: false,
  }),
  tags: fields.array(
    fields.text({ label: 'Tag' }),
    {
      label: 'Tags',
      itemLabel: props => props.value,
    }
  ),
  ogImage: fields.image({
    label: 'OG Image',
    directory: 'public/assets',
    publicPath: '/assets/',
  }),
  description: fields.text({
    label: 'Description',
    multiline: true,
    validation: { isRequired: true }
  }),
  canonicalURL: fields.url({
    label: 'Canonical URL',
  }),
  hideEditPost: fields.checkbox({
    label: 'Hide Edit Post Link',
    defaultValue: false,
  }),
  timezone: fields.text({
    label: 'Timezone',
  }),
  content: fields.mdx({
    label: 'Content',
    extension: 'md',
    options: {
      image: {
        directory: `src/assets/images/${imageDir}`,
        publicPath: `../../assets/images/${imageDir}/`,
      },
    },
  }),
});

export default config({
  storage: {
    kind: 'local', // We can change this to 'github' or 'cloud' in the future when deployed
  },
  collections: {
    blog: collection({
      label: 'Blog Posts',
      slugField: 'title',
      path: 'src/data/blog/*',
      format: { contentField: 'content' },
      schema: postFields('posts'),
    }),
    work: collection({
      label: 'Case Studies',
      slugField: 'title',
      path: 'src/data/work/*',
      format: { contentField: 'content' },
      schema: {
        ...postFields('work'),
        protected: fields.checkbox({
          label: 'Password protected',
          description:
            'Encrypts the case study at build time; visitors need WORK_PASSWORD to read it.',
          defaultValue: false,
        }),
      },
    }),
  },
  singletons: {
    hero: singleton({
      label: 'Work hero',
      path: 'src/data/hero',
      format: { data: 'yaml' },
      schema: {
        eyebrow: fields.array(
          fields.text({ label: 'Phrase', validation: { isRequired: true } }),
          {
            label: 'Eyebrow phrases',
            description:
              'The first phrase shows on load; hovering scrambles to the next. Keep them a similar length; the space reserved is the longest one.',
            itemLabel: props => props.value,
            validation: { length: { min: 1 } },
          }
        ),
        headline: fields.text({
          label: 'Headline',
          validation: { isRequired: true },
        }),
        body: fields.text({
          label: 'Body',
          multiline: true,
          description: 'A blank line starts a new paragraph.',
          validation: { isRequired: true },
        }),
      },
    }),
  },
});
