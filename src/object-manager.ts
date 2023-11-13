import {
  ConnectionArguments,
  findManyCursorConnection,
} from "@devoxa/prisma-relay-cursor-connection";
import { Prisma } from `${process.cwd() + "/node_modules/@prisma/client"}`;

export class ObjectManager<
  T extends keyof Prisma.TypeMap["model"],
  Cls extends new (fields: any) => InstanceType<Cls>
> {
  constructor(private instance: any, private model: Cls) {}

  get = async (
    args?: Prisma.TypeMap["model"][T]["operations"]["findFirst"]["args"]
  ): Promise<InstanceType<Cls>> => {
    const obj = await this.instance.findFirst(args);

    if (!obj) {
      throw new Error("Object not found");
    }

    const i = new this.model(obj);

    return i;
  };

  filter = async (
    args?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]
  ): Promise<InstanceType<Cls>[]> => {
    const objs = await this.instance.findMany(args);

    return objs.map((obj: any) => new this.model(obj)) as InstanceType<Cls>[];
  };

  paginate = async (
    connectionArguments?: ConnectionArguments,
    args?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]
  ) => {
    return findManyCursorConnection(
      async (connectionArgs) => {
        const objs = await this.instance.findMany({
          ...args,
          ...connectionArgs,
        });

        return objs.map(
          (obj: any) => new this.model(obj)
        ) as InstanceType<Cls>[];
      },
      () => this.count(args as any),
      connectionArguments
    );
  };

  create = async (
    args?: Prisma.TypeMap["model"][T]["operations"]["create"]["args"]
  ): Promise<InstanceType<Cls>> => {
    const obj = await this.instance.create(args);

    return new this.model(obj);
  };

  update = async (
    args?: Prisma.TypeMap["model"][T]["operations"]["update"]["args"]
  ): Promise<InstanceType<Cls>> => {
    const obj = await this.instance.update(args);

    return new this.model(obj);
  };

  delete = async (
    args?: Prisma.TypeMap["model"][T]["operations"]["delete"]["args"]
  ): Promise<InstanceType<Cls>> => {
    const obj = await this.instance.delete(args);

    return new this.model(obj);
  };

  upsert = async (
    args?: Prisma.TypeMap["model"][T]["operations"]["upsert"]["args"]
  ): Promise<InstanceType<Cls>> => {
    const obj = await this.instance.upsert(args);

    return new this.model(obj);
  };

  count = async (
    args?: Prisma.TypeMap["model"][T]["operations"]["count"]["args"]
  ): Promise<number> => {
    return await this.instance.count(args);
  };
}
