import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const nextRuntime = path.join(projectRoot, "lib/chess/runtime.ts");

const nextConfig: NextConfig = {
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^\.\/runtime(\.ts)?$/,
        (resource: { context: string; request: string }) => {
          if (resource.context.includes(`${path.sep}_shared${path.sep}chess`)) {
            resource.request = nextRuntime;
          }
        },
      ),
    );
    return config;
  },
};

export default nextConfig;
