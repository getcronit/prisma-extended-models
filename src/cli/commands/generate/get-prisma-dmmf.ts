import type { Prisma } from "@prisma/client";

const prismaClientPath = process.cwd() + "/node_modules/@prisma/client";

export const getPrismaDMMF = async (): Promise<typeof Prisma.dmmf> => {
  // It is important to import the Prisma client dynamically
  // to ensure the version after prisma generate is used!

  const P = await import(prismaClientPath);

  return P.Prisma.dmmf;
};
