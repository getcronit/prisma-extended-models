import * as fs from "fs";
import * as path from "path";

export const writeRepository = (code: {
  generated: string;
  crudService?: string;
}) => {
  // distPath is the path of the module ./dist
  const distPath = path.join(process.cwd(), "./src");

  const repositoryPath = path.join(distPath, "repository");

  const generatedPath = path.join(repositoryPath, ".generated.ts");
  const servicePath = path.join(repositoryPath, "crud-service.ts");
  const indexPath = path.join(repositoryPath, "index.ts");

  // Add try-catch for error handling
  try {
    // Create ./repository if it doesn't exist
    if (!fs.existsSync(repositoryPath)) {
      fs.mkdirSync(repositoryPath, {
        recursive: true,
      });
    }

    // Write to ./repository/.generated.ts
    fs.writeFileSync(generatedPath, code.generated);

    if (code.crudService) {
      // Write to ./repository/service.ts
      fs.writeFileSync(servicePath, code.crudService);
    }

    // Create ./repository/index.ts if it doesn't exist
    if (!fs.existsSync(indexPath)) {
      const indexContent = `import * as Repositories from "./.generated";

export default {
  ...Repositories,
};`;

      fs.writeFileSync(indexPath, indexContent);
    }
  } catch (error) {
    console.error("Error writing files:", error);
  }
};
