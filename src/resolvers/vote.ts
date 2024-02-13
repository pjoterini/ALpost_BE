import { AppDataSource } from '..'
import { Vote } from '../entities/Vote'
import { Arg, Field, Int, ObjectType, Query, Resolver } from 'type-graphql'

@ObjectType()
class userVotes {
  @Field(() => [Vote])
  votes: Vote[]
}

@Resolver(Vote)
export class VoteResolver {
  @Query(() => userVotes)
  async userVotes(
    @Arg('userId', () => Int) userId: Number
  ): Promise<userVotes> {
    const userVotes = await AppDataSource.getRepository(Vote)
      .createQueryBuilder('vote')
      .where('vote.userId = :userId', { userId: userId })
      .getMany()

    return {
      votes: userVotes
    }
  }
}
