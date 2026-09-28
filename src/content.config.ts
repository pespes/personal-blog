import { defineCollection, type SchemaContext } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";
export const WORK_PATH = "src/data/work";

// Frontmatter shared by blog posts and case studies.
const postSchema = ({ image }: SchemaContext) =>
  z.object({
    author: z.string().default(SITE.author),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    title: z.string(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["others"]),
    ogImage: image().or(z.string()).optional(),
    description: z.string(),
    canonicalURL: z.string().optional(),
    hideEditPost: z.boolean().optional(),
    timezone: z.string().optional(),
  });

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: postSchema,
});

// Case studies: posts shown under Work, optionally password protected.
const work = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${WORK_PATH}` }),
  schema: context =>
    postSchema(context).extend({
      protected: z.boolean().default(false),
    }),
});

export const collections = { blog, work };
