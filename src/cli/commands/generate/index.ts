import { generatePrismaClient } from "./generate-prisma-client";
import { getPrismaDMMF } from "./get-prisma-dmmf";
import { generateRepository } from "./generate-repository";
import { writeRepository } from "./write-repository";

export default async function generate(options: {
  pagination: boolean;
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

  // 4. Write repository
  console.log("Step 5: Writing repository");
  writeRepository({
    generated: repositoryCode,
    models: dmmf.datamodel.models.map((model) => model.name),
  });
  console.log("Step 5: Repository writing completed");
}
