import { AppDataSource } from "..";
import { Updoot } from "../entities/Updoot";
import { Arg, Field, Int, ObjectType, Query, Resolver } from "type-graphql";

@ObjectType()
class userUpdoots {
  @Field(() => [Updoot])
  updoots: Updoot[];
}

@Resolver(Updoot)
export class UpdootResolver {
  @Query(() => userUpdoots)
  async userUpdoots(
    @Arg("userId", () => Int) userId: Number
  ): Promise<userUpdoots> {
    const userUpdoots = await AppDataSource.getRepository(Updoot)
      .createQueryBuilder("updoot")
      .where("updoot.userId = :userId", { userId: userId })
      .getMany();

    return {
      updoots: userUpdoots,
    };
  }
}
