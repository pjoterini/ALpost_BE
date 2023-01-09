import { Post } from "../entities/Post";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { MyContext } from "src/types";
import { isAuth } from "../middleware/isAuth";
import { AppDataSource } from "../";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";
import { Replyupdoot } from "../entities/Replyupdoot";
import { Reply } from "../entities/Reply";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
  @Field()
  category: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}
@ObjectType()
class userPosts {
  @Field(() => [Post])
  posts: Post[];
}
@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 300);
  }

  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const isUpdoot = value != -1;
    const realValue = isUpdoot ? 1 : -1;
    const defaultValue = 0;

    const { userId } = req.session;
    const updoot = await Updoot.findOne({ where: { postId, userId } });

    if (updoot && updoot.value == defaultValue) {
      // the user tries to vote the same again
      await AppDataSource.transaction(async (tm) => {
        await tm.query(
          `
          update updoot
          set value = $1
          where "postId" = $2 and "userId" = $3
          `,
          [defaultValue, postId, userId]
        );

        await tm.query(
          `
          update post
          set points = points + $1
          where id = $2 
          `,
          [defaultValue, postId]
        );
      });
    } else if (
      updoot &&
      updoot.value !== defaultValue &&
      updoot.value !== realValue
    ) {
      // the user has voted on this post before
      // and they are changing their vote
      await AppDataSource.transaction(async (tm) => {
        await tm.query(
          `
          update updoot
          set value = $1
          where "postId" = $2 and "userId" = $3
          `,
          [realValue, postId, userId]
        );

        await tm.query(
          `
          update post
          set points = points + $1
          where id = $2
          `,
          [2 * realValue, postId]
        );
      });
    } else if (!updoot) {
      // has never voted before
      await AppDataSource.transaction(async (tm) => {
        await tm.query(
          `    
          insert into updoot ("userId", "postId", value)
          values ($1, $2, $3);
          `,
          [userId, postId, realValue]
        );

        await tm.query(
          `
          update post 
          set points = points + $1
          where id = $2;
          `,
          [realValue, postId]
        );
      });
    }

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Arg("search", () => String) search: string,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = Math.min(50, limit) + 1;
    search;

    const replacements: any[] = [realLimitPlusOne];

    if (req.session.userId) {
      replacements.push(req.session.userId);
    }

    let cursorIdx = 3;
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
      cursorIdx = replacements.length;
    }

    const posts = await AppDataSource.query(
      `
      select p.*,
      ${
        req.session.userId
          ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
          : 'null as "voteStatus"'
      }
      from post p
      
      ${search != "all" ? `where p."category" = '${search}'` : ""}${
        cursor
          ? `${search == "all" ? "where" : "and"} p."createdAt" < $${cursorIdx}`
          : ""
      }
          
      order by p."createdAt" DESC
      limit $1
      `,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => userPosts)
  async userPosts(
    @Arg("userId", () => Int) userId: Number
  ): Promise<userPosts> {
    const userPosts = await AppDataSource.getRepository(Post)
      .createQueryBuilder("post")
      .where("post.creator.id = :userId", { userId: userId })
      .getMany();

    return {
      posts: userPosts,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    return Post.findOne({ where: { id } });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Arg("category") category: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const result = await AppDataSource.createQueryBuilder()
      .update(Post)
      .set({ title, text, category })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    const post = await Post.findOne({ where: { id } });
    const reply = await Reply.findOne({ where: { postid: id } });
    if (!post) {
      return false;
    }
    if (post.creatorId !== req.session.userId) {
      throw new Error("no authorized");
    }

    await Updoot.delete({ postId: id });
    await Post.delete({ id, creatorId: req.session.userId });
    await Replyupdoot.delete({ replyId: reply?.id });
    await Reply.delete({ postid: id, creatorId: req.session.userId });
    return true;
  }
}
