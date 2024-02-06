import * as fs from "fs";
import * as path from "path";

const DIST_PATH = path.resolve(process.cwd(), "./src");
const REPOSITORY_PATH = path.resolve(DIST_PATH, "repository");
const GENERATED_PATH = path.resolve(REPOSITORY_PATH, ".generated.ts");

const createDirectoryIfNotExists = (directoryPath: string) => {
  try {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  } catch (error) {
    console.error(`Error creating directory ${directoryPath}:`, error);
    throw error; // Rethrow the error for higher-level handling if needed
  }
};

const createModelFileIfNotExists = (modelPath: string, content: string) => {
  try {
    if (!fs.existsSync(modelPath)) {
      console.log(`Creating model file ${modelPath}`);
      fs.writeFileSync(modelPath, content);
    }
  } catch (error) {
    console.error(`Error creating file ${modelPath}:`, error);
    throw error; // Rethrow the error for higher-level handling if needed
  }
};

const createClientFileIfNotExists = (clientPath: string) => {
  try {
    if (!fs.existsSync(clientPath)) {
      console.log(`Creating client file ${clientPath}`);
      fs.writeFileSync(
        clientPath,
        `import {PrismaClient} from "@prisma/client";
export const client = new PrismaClient()`
      );

      return true;
    }
  } catch (error) {
    console.error(`Error creating file ${clientPath}:`, error);
    throw error; // Rethrow the error for higher-level handling if needed
  }
};

export const writeRepository = (code: {
  generated: string;
  models: string[];
}) => {
  try {
    // Create ./repository if it doesn't exist
    createDirectoryIfNotExists(REPOSITORY_PATH);

    // Write to ./repository/.generated.ts
    fs.writeFileSync(GENERATED_PATH, code.generated);

    // Models (./repository/models)
    const MODELS_PATH = path.resolve(REPOSITORY_PATH, "models");

    // Create ./repository/models if it doesn't exist
    createDirectoryIfNotExists(MODELS_PATH);

    // Create model files if they don't exist
    code.models.forEach((model) => {
      const MODEL_PATH = path.resolve(MODELS_PATH, `${model}.ts`);

      const prismaInstanceName = model[0]?.toLowerCase() + model.slice(1);

      const content = `import { ObjectManager } from "@netsnek/prisma-repository";

import {client} from "../client";
import {${model}Repository} from "../.generated";


export class ${model} extends ${model}Repository {

  static objects = new ObjectManager<"${model}", typeof ${model}>(client.${prismaInstanceName},${model});

  // Custom logic here...
}`;

      createModelFileIfNotExists(MODEL_PATH, content);
    });

    const CLIENT_PATH = path.resolve(REPOSITORY_PATH, "client.ts");

    // Create ./repository/client.ts if it doesn't exist
    createClientFileIfNotExists(CLIENT_PATH);

    // Additional logic for other directories or files if needed...
  } catch (error) {
    console.error("Error writing files:", error);
  }
};
