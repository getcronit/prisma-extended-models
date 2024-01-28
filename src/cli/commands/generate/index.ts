import { generatePrismaClient } from "./generate-prisma-client";
import { getPrismaDMMF } from "./get-prisma-dmmf";
import { generateRepository } from "./generate-repository";
import { writeRepository } from "./write-repository";
import { generateCRUDService } from "./generate-crud-service";

export default async function generate(options: {
  pagination: boolean;
  service: boolean;
  pm: "yarn" | "npm" | "bun";
}) {
  // 1. Perform prisma generate
  console.log(`Step 1: Performing ${options.pm} prisma generate`);
  await generatePrismaClient({ pm: options.pm });
  console.log("Step 1: Prisma client generation completed");

  // 2. Initiate Prisma Client and get DMMF
  console.log("Step 2: Initializing Prisma Client and getting DMMF");
  const dmmf = await getPrismaDMMF();
  console.log("Step 2: DMMF retrieval completed");

  // 3. Generate repository
  console.log("Step 3: Generating repository");
  const repositoryCode = await generateRepository({
    dmmf,
    flags: { pagination: options.pagination },
  });
  console.log("Step 3: Repository generation completed");

  let crudServiceCode: string | undefined = undefined;

  // 4. Generate service (optional)
  if (options.service) {
    console.log("Step 4: Generating CRUD service");
    crudServiceCode = generateCRUDService({ dmmf });
    console.log("Step 4: CRUD Service generation completed");
  } else {
    console.log("Step 4: Skipping CRUD service generation");
  }

  // 4. Write repository
  console.log("Step 5: Writing repository");
  writeRepository({
    generated: repositoryCode,
    crudService: crudServiceCode,
  });
  console.log("Step 5: Repository writing completed");
}
