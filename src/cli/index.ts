#!/usr/bin/env -S node
import { Command } from "commander";

import packageJson from "./utils/package-json.js";
import * as commands from "./commands/index.js";

// Set development environment
process.env.NODE_ENV = process.env.NODE_ENV || "development";

export const program = new Command();

program
  .name("prisma-repository")
  .description("Prisma Repository CLI")
  .version(packageJson.version);

program
  .command("generate")
  .description("Generate repository")
  .option("--pagination", "Generate repository with pagination", true)
  .option("--service", "Generate repository with service", true)
  .option("--pm", "Specify package manager to use", "yarn")
  .action(commands.generate);

program.parse();
