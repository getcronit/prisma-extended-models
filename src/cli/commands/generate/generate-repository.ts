import type { Prisma } from "@prisma/client";
import ts from "typescript";

const prismaClientPath =
  process.cwd() + "/node_modules/@prisma/client/index.d.ts";

const getPrismaSymbols = () => {
  console.log("prismaClientPath", prismaClientPath);

  const program = ts.createProgram({
    rootNames: [prismaClientPath],
    options: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.CommonJS,
    },
  });

  const checker = program.getTypeChecker();

  const prismaClient = program.getSourceFile(prismaClientPath)!;

  if (!prismaClient) {
    throw new Error("Could not find Prisma client");
  }

  const sourceFileSymbol = checker.getSymbolAtLocation(prismaClient)!;

  const exportsSymbols = checker.getExportsOfModule(sourceFileSymbol);

  return { exportsSymbols, checker };
};

const buildClasses = (
  {
    dmmf,
    flags,
  }: {
    dmmf: typeof Prisma.dmmf;
    flags: {
      pagination: boolean;
    };
  },
  { checker, exportsSymbols }: ReturnType<typeof getPrismaSymbols>
) => {
  let code = ``;

  const objectManager = (modelName: string, prismaInstanceName: string) => {
    return `static objects = new ObjectManager<"${modelName}", typeof ${modelName}>(
    client.${prismaInstanceName},
    ${modelName}
  );\n`;
  };

  const constructor = (model: any) => {
    const relationFromFields = model.fields
      .filter((field: { kind: string }) => field.kind === "object")
      .map((field: { relationFromFields: any }) => field.relationFromFields)
      .flat();

    const hiddenFields = model.fields
      .filter((field: any) => {
        return (
          relationFromFields.includes(field.name) ||
          field.documentation?.includes("@sf-hide")
        );
      })
      .map((field: any) => field.name);

    return `constructor(data: Prisma.${model.name}CreateInput) {
        super();

        const hiddenFields: string[] = ${JSON.stringify(hiddenFields)};

        this.$boostrap(this, data, hiddenFields);
  }\n`;
  };

  const classFields = (modelName: string, modelFields: any[]) => {
    function propertyDefinitions() {
      const tsModelSymbol = exportsSymbols.find((symbol) => {
        return symbol.name === modelName;
      });

      if (!tsModelSymbol)
        throw new Error(`Could not find model ${modelName} in Prisma client`);

      const tsModelType = checker.getDeclaredTypeOfSymbol(tsModelSymbol);

      const tsModelPropertyDefinitions = tsModelType
        .getProperties()
        .map((property) => {
          const type = property.valueDeclaration
            ?.getText()
            .replace(`${property.getName()}: `, "");

          return {
            name: property.getName(),
            type,
          };
        });

      return tsModelPropertyDefinitions;
    }

    function buildFieldKV(field: any) {
      const fieldDef = propertyDefinitions().find(
        (property) => property.name === field.name
      );

      const relationFromFields = modelFields
        .filter((field) => field.kind === "object")
        .map((field) => field.relationFromFields)
        .flat();

      if (!fieldDef) {
        // When the field is not found in the model, it's a relation.
        // This is because Prisma Client does not generate relations as properties.

        let type = `InstanceType<typeof _Repository.${field.type}>`;

        if (field.isList) {
          type += "[]";
        }

        if (!field.isRequired) {
          type += " | null";
        }

        let managerMethod = field.isList ? "filter" : "get";

        if (flags.pagination && field.isList) {
          managerMethod = "paginate";
        }

        const where = field.relationToFields.reduce(
          (
            acc: Record<string, any>,
            curr: string | number,
            i: string | number
          ) => {
            acc[curr] = `this.$${field.relationFromFields[i]}`;

            return acc;
          },
          {} as Record<string, any>
        );

        const isImplicitManyToMany =
          field.relationName &&
          field.relationFromFields.length === 0 &&
          field.relationToFields.length === 0;

        if (isImplicitManyToMany) {
          let relationModel = null;

          for (const model of dmmf.datamodel.models) {
            const relation = model.fields.find(
              (f) => f.relationName === field.relationName
            );

            if (relation) {
              if (
                modelName !== model.name ||
                (relation.relationFromFields &&
                  relation.relationFromFields.length > 0)
              ) {
                relationModel = relation;
              }
              continue;
            }
          }

          if (relationModel) {
            const rff = relationModel.relationFromFields || [];
            const rtf = relationModel.relationToFields || [];

            const isRealManyToMany = rff.length === 0 && rtf.length === 0;

            if (isRealManyToMany) {
              where[relationModel.name] = { some: { id: "this.id" } };
            } else {
              for (const [i, key] of rff.entries()) {
                where[key] = `this.${rtf[i]}`;
              }
            }
          }
        }

        const objectsStatement = `_Repository.${field.type}.objects.${managerMethod}`;
        const whereStatement = JSON.stringify(where)
          .replace(/"/g, "")
          .slice(1, -1);

        const isPaginated = flags.pagination && field.isList;

        const objectStatementType = !field.isRequired
          ? `${
              isPaginated ? "NullablePaginateFuntion" : "NullableGetFunction"
            }<typeof ${objectsStatement}>`
          : `typeof ${objectsStatement}`;

        return `${field.name}: ${objectStatementType} = async (...args) => {
      ${field.relationFromFields
        .map((f: any) => {
          if (field.isRequired) {
            return `if (!this.$${f}) throw new Error("Relation ${f} is required");`;
          }

          return `if (!this.$${f}) return null;`;
        })
        .join("\n")}
  

      args[${isPaginated ? 1 : 0}] = {...args[${
          isPaginated ? 1 : 0
        }], ${whereStatement}};
  
      return ${objectsStatement}(...args);
    };\n`;
      } else {
        const shouldPrefix =
          relationFromFields.includes(field.name) ||
          field.documentation?.includes("@sf-hide");

        if (shouldPrefix) {
          return `$${field.name}!: ${fieldDef.type};\n`;
        }

        //> 6. If the field is not an object field, generate a class field with the type of the field
        return `${field.name}!: ${fieldDef.type};\n`;
      }
    }

    let code = ``;

    for (const field of modelFields) {
      code += buildFieldKV(field);
    }

    return code;
  };

  for (const model of dmmf.datamodel.models) {
    const prismaInstanceName =
      model.name[0]?.toLowerCase() + model.name.slice(1);

    code += `export class ${model.name} extends Model {

    ${objectManager(model.name, prismaInstanceName)}


    ${constructor(model)}


    ${classFields(model.name, model.fields)}
  }\n\n`;
  }

  return code;
};

export const generateRepository = async (options: {
  dmmf: typeof Prisma.dmmf;
  flags: {
    pagination: boolean;
  };
}) => {
  let code = `// @ts-ignore
import type {$Enums} from "@prisma/client";
import {PrismaClient} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { ConnectionArguments } from "@devoxa/prisma-relay-cursor-connection";
import { Model, ObjectManager, NullableGetFunction, NullablePaginateFuntion } from "@netsnek/prisma-repository";

import _Repository from './index.js'

const client = new PrismaClient()
`;

  const exportsSymbols = getPrismaSymbols();

  code += buildClasses(options, exportsSymbols);

  return code;
};
