import { User } from '../entities/User'
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
  UseMiddleware
} from 'type-graphql'
import { AppDataSource } from '../'
import { Reply } from '../entities/Reply'
import { isAuth } from '../middleware/isAuth'
import { MyContext } from '../types'
import { ReplyVote } from '../entities/ReplyVote'

@InputType()
class ReplyInput {
  @Field()
  text: string
  @Field(() => Int)
  postid: number
}

@ObjectType()
class PaginatedReplies {
  @Field(() => [Reply])
  replies: Reply[]
  @Field()
  hasMore: boolean
}

@Resolver(Reply)
export class ReplyResolver {
  @FieldResolver(() => User)
  creator(@Root() reply: Reply, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(reply.creatorId)
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async voteReply(
    @Arg('replyId', () => Int) replyId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const isUpdoot = value != -1
    const realValue = isUpdoot ? 1 : -1
    const defaultValue = 0

    const { userId } = req.session
    const vote = await ReplyVote.findOne({ where: { replyId, userId } })

    if (vote && vote.value == defaultValue) {
      // the user tries to vote the same again
      await AppDataSource.transaction(async (tm) => {
        await tm.query(
          `
          update replyvote
          set value = $1
          where "replyId" = $2 and "userId" = $3
          `,
          [defaultValue, replyId, userId]
        )

        await tm.query(
          `
          update reply
          set points = points + $1
          where id = $2 
          `,
          [defaultValue, replyId]
        )
      })
    } else if (
      vote &&
      vote.value !== defaultValue &&
      vote.value !== realValue
    ) {
      // the user has voted on this post before
      // and they are changing their vote
      await AppDataSource.transaction(async (tm) => {
        await tm.query(
          `
          update replyvote
          set value = $1
          where "replyId" = $2 and "userId" = $3
          `,
          [realValue, replyId, userId]
        )

        await tm.query(
          `
          update reply
          set points = points + $1
          where id = $2
          `,
          [2 * realValue, replyId]
        )
      })
    } else if (!vote) {
      // has never voted before
      await AppDataSource.transaction(async (tm) => {
        await tm.query(
          `    
          insert into replyvote ("userId", "replyId", value)
          values ($1, $2, $3);
          `,
          [userId, replyId, realValue]
        )

        await tm.query(
          `
          update reply 
          set points = points + $1
          where id = $2;
          `,
          [realValue, replyId]
        )
      })
    }

    return true
  }

  @Mutation(() => Reply)
  @UseMiddleware(isAuth)
  async createReply(
    @Arg('input') input: ReplyInput,
    @Ctx() { req }: MyContext
  ): Promise<Reply> {
    return Reply.create({
      ...input,
      creatorId: req.session.userId
    }).save()
  }

  @Query(() => PaginatedReplies)
  async replies(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Arg('postid', () => Int) postid: number,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedReplies> {
    const realLimit = Math.min(50, limit)
    const realLimitPlusOne = Math.min(50, limit) + 1
    postid

    const replacements: any[] = [realLimitPlusOne]

    if (req.session.userId) {
      replacements.push(req.session.userId)
    }

    let cursorIdx = 3
    if (cursor) {
      replacements.push(new Date(parseInt(cursor)))
      cursorIdx = replacements.length
    }

    const replies = await AppDataSource.query(
      `
      select r.*,
      ${
        req.session.userId
          ? '(select value from replyvote where "userId" = $2 and "replyId" = r.id) "voteStatus"'
          : 'null as "voteStatus"'
      }
      from reply r
      
      where r.postid = ${postid}${
        cursor ? ` and r."createdAt" < $${cursorIdx}` : ''
      }
          
      order by r."createdAt" DESC
      limit $1
      `,
      replacements
    )

    return {
      replies: replies.slice(0, realLimit),
      hasMore: replies.length === realLimitPlusOne
    }
  }

  @Query(() => Reply, { nullable: true })
  reply(@Arg('id', () => Int) id: number): Promise<Reply | null> {
    return Reply.findOne({ where: { id } })
  }

  @Mutation(() => Reply, { nullable: true })
  @UseMiddleware(isAuth)
  async updateReply(
    @Arg('id', () => Int) id: number,
    @Arg('text') text: string,
    @Ctx() { req }: MyContext
  ): Promise<Reply | null> {
    const result = await AppDataSource.createQueryBuilder()
      .update(Reply)
      .set({ text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId
      })
      .returning('*')
      .execute()

    return result.raw[0]
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteReply(
    @Arg('id', () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    const reply = await Reply.findOne({ where: { id } })
    if (!reply) {
      return false
    }
    if (reply.creatorId !== req.session.userId) {
      throw new Error('no authorized')
    }

    await ReplyVote.delete({ replyId: id })
    await Reply.delete({ id, creatorId: req.session.userId })
    return true
  }
}
