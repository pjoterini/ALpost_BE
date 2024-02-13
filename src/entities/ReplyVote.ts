import { Field, ObjectType } from 'type-graphql'
import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm'
import { Reply } from './Reply'
import { User } from './User'

@ObjectType()
@Entity()
export class ReplyVote extends BaseEntity {
  @Field()
  @Column({ type: 'int' })
  value: number

  @Field()
  @PrimaryColumn()
  userId: number

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.replyvotes)
  user: User

  @Field()
  @PrimaryColumn()
  replyId: number

  @Field(() => Reply)
  @ManyToOne(() => Reply, (reply) => reply.votes)
  reply: Reply
}
