import ts from "typescript";
import type { Prisma } from "@prisma/client";

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

// const capitalize = (str: string) => {
//   return str.charAt(0).toUpperCase() + str.slice(1);
// };

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

        let type = `InstanceType<typeof ${field.type}>`;

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

        let relationFromFields = field.relationFromFields || [];
        let relationToFields = field.relationToFields || [];
        let relationModel = null;

        if (isImplicitManyToMany) {
          // Take the first model that has the same relation name
          // and that is not the current model

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
            relationToFields = relationModel.relationFromFields || [];
            relationFromFields = relationModel.relationToFields || [];
          }
        }

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

        const objectsStatement = `${field.type}Model.objects.${managerMethod}`;
        const whereStatement = JSON.stringify(where)
          .replace(/"/g, "")
          .slice(1, -1);

        const isPaginated = field.isList;

        const objectStatementType = !field.isRequired
          ? `${
              isPaginated ? "NullablePaginateFunction" : "NullableGetFunction"
            }<typeof ${objectsStatement}>`
          : `typeof ${objectsStatement}`;

        const codeSnippets: string[] = [];

        const getList = `async ${field.name} ${
          isPaginated
            ? `(pagination?: Parameters<${objectStatementType}>[0], where?: Parameters<${objectStatementType}>[1], orderBy?: Parameters<${objectStatementType}>[2])`
            : `(where?: Parameters<${objectStatementType}>[0], orderBy?: Parameters<${objectStatementType}>[1])`
        } {
      ${field.relationFromFields
        .map((f: any) => {
          if (field.isRequired) {
            return `if (!this.$${f}) throw new Error("Relation ${f} is required");`;
          }

          return `if (!this.$${f}) return null;`;
        })
        .join("\n")}


      const _where = {
        ...where,
        ${whereStatement}
      }

        const Model = (await require('./models/${field.type}')).${
          field.type
        } as typeof ${field.type}Model;

      try {
        return await Model.objects.${managerMethod}(
          ${isPaginated ? `pagination, _where, orderBy` : `_where, orderBy`}
        );
      } catch (e) {
        ${field.isRequired ? "throw e;" : "return null;"}
      }
  
      
    };\n`;

        codeSnippets.push(getList);

        if (field.isList) {
          // The name is the field name (without the 's' at the end if it exists e.g. posts -> post. Else, it's the field name plus '_' e.g. post -> post_)
          const name = field.name.endsWith("s")
            ? field.name.slice(0, -1)
            : field.name + "_";

          const getOne = `async ${name} (where: Parameters<typeof ${
            field.type
          }Model.objects.get>[0]) {
          ${field.relationFromFields
            .map((f: any) => {
              if (field.isRequired) {
                return `if (!this.$${f}) throw new Error("Relation ${f} is required");`;
              }

              return `if (!this.$${f}) return null;`;
            })
            .join("\n")}
    
          where = {...where, ${whereStatement}};
    
          const Model = (await require('./models/${field.type}')).${
            field.type
          } as typeof ${field.type}Model;
    
          try {
            return await Model.objects.get(where);
          }
          catch (e) {
            ${field.isRequired ? "throw e;" : "return null;"}
          }
        };\n`;

          codeSnippets.push(getOne);
        }

        const relations = relationToFields;

        const omitRelations = relations
          .concat(relationModel?.name || [])
          .map((f: any) => `'${f}'`)
          .join(" | ");

        const prefixIfNotId = (f: string) => {
          if (f === "id") {
            return f;
          }

          return `$${f}`;
        };

        const createRelation = `async $${field.name}Add (data: Omit<Prisma.${
          field.type
        }CreateArgs['data'], ${omitRelations}> ) {
          const Model = (await require('./models/${field.type}')).${
          field.type
        } as typeof ${field.type}Model;

          try {
            return await Model.objects.create({...data, ${relationToFields.map(
              (f: any, i: number) =>
                `${f}: this.${prefixIfNotId(relationFromFields[i])} `
            )}} as any);
          } catch (e) {
            throw e
          }
        }
      `;

        codeSnippets.push(createRelation);

        const updateRelation = `async $${field.name}Update (data: Prisma.${
          field.type
        }UpdateArgs['data'], where: Prisma.${field.type}UpdateArgs['where']) {
          const Model = (await require('./models/${field.type}')).${
          field.type
        } as typeof ${field.type}Model;

          try {
            return await Model.objects.update(data, {...where, ${relationToFields.map(
              (f: any, i: number) =>
                `${f}: this.${prefixIfNotId(
                  relationFromFields[i]
                )} || undefined`
            )}});
          } catch (e) {
            throw e
          }
          
       
            }
          `;

        codeSnippets.push(updateRelation);

        const deleteRelation = `async $${
          field.name
        }Delete (where: Omit<Prisma.${
          field.type
        }DeleteArgs['where'], ${omitRelations}>) {
          const Model = (await require('./models/${field.type}')).${
          field.type
        } as typeof ${field.type}Model;

          try {
            return await Model.objects.delete({...where, ${relationToFields.map(
              (f: any, i: number) =>
                `${f}: this.${prefixIfNotId(
                  relationFromFields[i]
                )} || undefined`
            )}} as any);
          } catch (e) {
            throw e
          }
        }
      `;

        codeSnippets.push(deleteRelation);

        return codeSnippets.join("\n");
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
    code += `export abstract class ${model.name}Repository extends Repository {

    ${constructor(model)}

    ${classFields(model.name, model.fields as any)}
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

import { Prisma } from "@prisma/client";
import { Repository, NullableGetFunction, NullablePaginateFunction } from "@getcronit/prisma-extended-models";

${
  options.dmmf.datamodel.models
    .map((model) => {
      return `import {${model.name} as ${model.name}Model} from "./models/${model.name}";`;
    })
    .join("\n") + "\n"
}
`;

  const exportsSymbols = getPrismaSymbols();

  code += buildClasses(options, exportsSymbols);

  return code;
};
