import {
  ConnectionArguments,
  findManyCursorConnection,
} from "@devoxa/prisma-relay-cursor-connection";
import { Prisma } from "@prisma/client";

import {
  CreateError,
  NotFoundError,
  UpdateError,
  UpsertError,
} from "./errors.js";

export class ObjectManager<
  T extends keyof Prisma.TypeMap["model"],
  Cls extends new (fields: any) => InstanceType<Cls>
> {
  constructor(private instance: any, private model: Cls) {}

  get = async (
    where?: Prisma.TypeMap["model"][T]["operations"]["findFirst"]["args"]["where"],
    orderBy?: Prisma.TypeMap["model"][T]["operations"]["findFirst"]["args"]["orderBy"]
  ): Promise<InstanceType<Cls>> => {
    const obj = await this.instance.findFirst({ where, orderBy });

    if (!obj) {
      throw new NotFoundError();
    }

    return new this.model(obj);
  };

  filter = async (
    where?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]["where"],
    orderBy?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]["orderBy"]
  ): Promise<InstanceType<Cls>[]> => {
    const objs = await this.instance.findMany({ where, orderBy });

    return objs.map((obj: any) => new this.model(obj)) as InstanceType<Cls>[];
  };

  paginate = async (
    pagination?: ConnectionArguments,
    where?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]["where"],
    orderBy?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]["orderBy"]
  ) => {
    return findManyCursorConnection(
      async (connectionArgs) => {
        const objs = await this.instance.findMany({
          where,
          orderBy,
          ...connectionArgs,
        });

        return objs.map(
          (obj: any) => new this.model(obj)
        ) as InstanceType<Cls>[];
      },
      () => this.count(where, orderBy),
      pagination
    );
  };

  create = async (
    data: Prisma.TypeMap["model"][T]["operations"]["create"]["args"]["data"]
  ): Promise<InstanceType<Cls>> => {
    try {
      const obj = await this.instance.create({ data });

      return new this.model(obj);
    } catch (e) {
      console.error(e);

      throw new CreateError();
    }
  };

  update = async (
    data: Prisma.TypeMap["model"][T]["operations"]["update"]["args"]["data"],
    where: Prisma.TypeMap["model"][T]["operations"]["update"]["args"]["where"]
  ): Promise<InstanceType<Cls>> => {
    try {
      const obj = await this.instance.update({ data, where });

      return new this.model(obj);
    } catch (e) {
      console.error(e);
      throw new UpdateError();
    }
  };

  delete = async (
    where: Prisma.TypeMap["model"][T]["operations"]["delete"]["args"]["where"]
  ): Promise<InstanceType<Cls>> => {
    const obj = await this.instance.delete({ where });

    return new this.model(obj);
  };

  upsert = async (
    create: Prisma.TypeMap["model"][T]["operations"]["upsert"]["args"]["create"],
    update: Prisma.TypeMap["model"][T]["operations"]["upsert"]["args"]["update"],
    where: Prisma.TypeMap["model"][T]["operations"]["upsert"]["args"]["where"]
  ): Promise<InstanceType<Cls>> => {
    try {
      const obj = await this.instance.upsert({ create, update, where });

      return new this.model(obj);
    } catch (e) {
      console.error(e);
      throw new UpsertError();
    }
  };

  count = async (
    where?: Prisma.TypeMap["model"][T]["operations"]["count"]["args"]["where"],
    orderBy?: Prisma.TypeMap["model"][T]["operations"]["count"]["args"]["orderBy"]
  ): Promise<number> => {
    return await this.instance.count({ orderBy, where });
  };
}
