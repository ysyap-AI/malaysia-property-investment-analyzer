import { createFileRoute } from "@tanstack/react-router";

import { Showcase } from "@/showcase/Showcase";
import showcaseCss from "@/showcase/showcase.css?url";

// Reuse the accepted M1–M3 UI and memory-only session in the main Start build.
// This public application route relies on Lovable's separately configured
// whole-website invitation gate after an owner-approved publication.
export const Route = createFileRoute("/showcase")({
  head: () => ({
    meta: [
      { title: "MPIA | Synthetic investment showcase" },
      {
        name: "description",
        content: "Fictional properties, locations and amenities. Session-only demonstration.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
    links: [{ rel: "stylesheet", href: showcaseCss }],
  }),
  component: Showcase,
});
