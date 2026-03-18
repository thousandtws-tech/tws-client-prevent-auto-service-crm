import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const getPackageName = (id: unknown) => {
  if (typeof id !== "string" || !id) {
    return null;
  }

  const normalizedId = id.replace(/\\/g, "/");
  const nodeModulesMarker = "/node_modules/";
  const nodeModulesIndex = normalizedId.lastIndexOf(nodeModulesMarker);

  if (nodeModulesIndex === -1) {
    return null;
  }

  const modulePath = normalizedId.slice(nodeModulesIndex + nodeModulesMarker.length);
  const [scopeOrName, scopedName] = modulePath.split("/");

  if (scopeOrName?.startsWith("@") && scopedName) {
    return `${scopeOrName}/${scopedName}`;
  }

  return scopeOrName ?? null;
};

const getManualChunk = (id: unknown) => {
  if (typeof id !== "string") {
    return undefined;
  }

  const packageName = getPackageName(id);

  if (!packageName) {
    return undefined;
  }

  if (packageName === "react" || packageName === "react-dom" || packageName === "scheduler") {
    return "react-vendor";
  }

  if (packageName === "react-router" || packageName === "@remix-run/router") {
    return "router";
  }

  if (packageName.startsWith("@refinedev/")) {
    return "refine";
  }

  if (packageName === "@mui/icons-material") {
    return "mui-icons";
  }

  if (packageName.startsWith("@mui/x-")) {
    return "mui-x";
  }

  if (packageName.startsWith("@mui/") || packageName.startsWith("@emotion/")) {
    return "mui";
  }

  if (
    packageName === "recharts" ||
    packageName.startsWith("d3-") ||
    packageName === "victory-vendor"
  ) {
    return "charts";
  }

  if (packageName === "google-map-react" || packageName === "@googlemaps/react-wrapper") {
    return "maps";
  }

  if (
    packageName === "i18next" ||
    packageName === "react-i18next" ||
    packageName.startsWith("i18next-")
  ) {
    return "i18n";
  }

  if (
    packageName === "@uiw/react-md-editor" ||
    packageName === "@uiw/react-markdown-preview" ||
    packageName.startsWith("remark-") ||
    packageName.startsWith("rehype-") ||
    packageName === "remark-gfm" ||
    packageName === "unified" ||
    packageName === "micromark"
  ) {
    return "editor";
  }

  if (
    packageName === "react-hook-form" ||
    packageName === "react-input-mask" ||
    packageName.startsWith("@tanstack/")
  ) {
    return "forms";
  }

  if (packageName === "axios" || packageName === "qs") {
    return "http";
  }

  if (
    packageName === "dayjs" ||
    packageName === "lodash" ||
    packageName === "lodash-es" ||
    packageName === "usehooks-ts"
  ) {
    return "utils";
  }

  return undefined;
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: getManualChunk,
      },
    },
  },
});
