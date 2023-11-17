import { Prisma } from "@prisma/client";

export const generateCRUDService = (options: {
  dmmf: typeof Prisma.dmmf;
}): string => {
  const dmmf = options.dmmf;

  const models = dmmf.datamodel.models.map((model) => model.name);

  const service: {
    Query: Record<string, any>;
    Mutation: Record<string, any>;
  } = {
    Query: {},
    Mutation: {},
  };

  for (const model of models) {
    const modelInstanceName = model[0]!.toLowerCase() + model.slice(1);

    service.Query[modelInstanceName] = `repository.${model}.objects.get`;
    service.Query[`all${model}`] = `repository.${model}.objects.filter`;

    service.Mutation[
      `${modelInstanceName}Create`
    ] = `repository.${model}.objects.create`;
    service.Mutation[
      `${modelInstanceName}Update`
    ] = `repository.${model}.objects.update`;
    service.Mutation[
      `${modelInstanceName}Upsert`
    ] = `repository.${model}.objects.upsert`;
    service.Mutation[
      `${modelInstanceName}Delete`
    ] = `repository.${model}.objects.delete`;
  }

  let serviceCode = `import repository from "./index.js";

export const service = {
  Query: {
`;
  for (const query of Object.keys(service.Query)) {
    serviceCode += `    ${query}: ${service.Query[query]},\n`;
  }
  serviceCode += `  },
  Mutation: {
`;
  for (const mutation of Object.keys(service.Mutation)) {
    serviceCode += `    ${mutation}: ${service.Mutation[mutation]},\n`;
  }

  serviceCode += `  }
  }
  `;

  return serviceCode;
};
