const prismaClientPath = process.cwd() + "/node_modules/@prisma/client";

export const getPrismaDMMF = async () => {
  // It is important to import the Prisma client dynamically
  // to ensure the version after yarn prisma generate is used!

  const Prisma = await import(prismaClientPath);

  return Prisma.Prisma.dmmf;
};
