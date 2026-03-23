import { config, fields, collection } from '@keystatic/core';
import { SITE } from "./src/config";

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
      schema: {
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
              directory: 'src/assets/images/posts',
              publicPath: '../../assets/images/posts/',
            },
          },
        }),
      },
    }),
  },
});
