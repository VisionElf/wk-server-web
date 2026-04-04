import type { SubAppDefinition } from "../../core/subAppTypes";

export const workspaceApp: SubAppDefinition = {
  id: "workspace",
  title: "Workspace",
  pathPrefix: "/workspace",
  subNav: [
    { segment: "board", label: "Board" },
    { segment: "files", label: "Files" },
  ],
};
