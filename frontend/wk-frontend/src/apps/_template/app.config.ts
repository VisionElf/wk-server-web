import type { SubAppDefinition } from "../../core/subAppTypes";

/** Replace all SAMPLE_* values when copying this folder. */
export const sampleApp: SubAppDefinition = {
  id: "SAMPLE_APP_ID",
  title: "Sample app",
  pathPrefix: "/sample-app",
  subNav: [
    { segment: "home", label: "Home" },
    { segment: "extra", label: "Extra" },
  ],
};
