import type { APIRoute } from "astro";
import fs from "fs";
import path from "path";

export const prerender = true;

export const GET: APIRoute = async () => {
  // Return the default static OG image
  const buffer = fs.readFileSync(path.resolve("./public/astropaper-og.jpg"));
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/jpeg" },
  });
};
