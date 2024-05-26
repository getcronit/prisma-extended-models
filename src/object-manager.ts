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
  constructor(protected instance: any, private model: Cls) {
    this.get = this.get.bind(this);
    this.filter = this.filter.bind(this);
    this.paginate = this.paginate.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.upsert = this.upsert.bind(this);
    this.count = this.count.bind(this);
  }

  async get(
    where?: Prisma.TypeMap["model"][T]["operations"]["findFirst"]["args"]["where"],
    orderBy?: Prisma.TypeMap["model"][T]["operations"]["findFirst"]["args"]["orderBy"]
  ): Promise<InstanceType<Cls>> {
    const obj = await this.instance.findFirst({ where, orderBy });

    if (!obj) {
      throw new NotFoundError();
    }

    return new this.model(obj);
  }

  async filter(
    where?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]["where"],
    orderBy?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]["orderBy"]
  ): Promise<InstanceType<Cls>[]> {
    const objs = await this.instance.findMany({ where, orderBy });

    return objs.map((obj: any) => new this.model(obj)) as InstanceType<Cls>[];
  }

  async paginate(
    pagination?: ConnectionArguments,
    where?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]["where"],
    orderBy?: Prisma.TypeMap["model"][T]["operations"]["findMany"]["args"]["orderBy"]
  ) {
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
  }

  async create(
    data: Prisma.TypeMap["model"][T]["operations"]["create"]["args"]["data"]
  ): Promise<InstanceType<Cls>> {
    try {
      const obj = await this.instance.create({ data });

      return new this.model(obj);
    } catch (e) {
      console.error(e);

      throw new CreateError();
    }
  }

  async update(
    data: Prisma.TypeMap["model"][T]["operations"]["update"]["args"]["data"],
    where: Prisma.TypeMap["model"][T]["operations"]["update"]["args"]["where"]
  ): Promise<InstanceType<Cls>> {
    try {
      const obj = await this.instance.update({ data, where });

      return new this.model(obj);
    } catch (e) {
      console.error(e);
      throw new UpdateError();
    }
  }

  async delete(
    where: Prisma.TypeMap["model"][T]["operations"]["delete"]["args"]["where"]
  ): Promise<InstanceType<Cls>> {
    const obj = await this.instance.delete({ where });

    return new this.model(obj);
  }

  async upsert(
    create: Prisma.TypeMap["model"][T]["operations"]["upsert"]["args"]["create"],
    update: Prisma.TypeMap["model"][T]["operations"]["upsert"]["args"]["update"],
    where: Prisma.TypeMap["model"][T]["operations"]["upsert"]["args"]["where"]
  ): Promise<InstanceType<Cls>> {
    try {
      const obj = await this.instance.upsert({ create, update, where });

      return new this.model(obj);
    } catch (e) {
      console.error(e);
      throw new UpsertError();
    }
  }

  async count(
    where?: Prisma.TypeMap["model"][T]["operations"]["count"]["args"]["where"],
    orderBy?: Prisma.TypeMap["model"][T]["operations"]["count"]["args"]["orderBy"]
  ): Promise<number> {
    return await this.instance.count({ orderBy, where });
  }
}
