import { Field, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Post } from './Post'
import { Vote } from './Vote'
import { Reply } from './Reply'
import { ReplyVote } from './ReplyVote'

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number

  @Field()
  @Column({ unique: true })
  username!: string

  @Field()
  @Column({ unique: true })
  email!: string

  @Column()
  password!: string

  @Field(() => [Post])
  @OneToMany(() => Post, (post) => post.creator)
  posts: Post[]
  @Field(() => [Reply])
  @OneToMany(() => Reply, (reply) => reply.creator)
  replies: Reply[]

  @Field(() => [Vote])
  @OneToMany(() => Vote, (vote) => vote.user)
  votes: Vote[]

  @Field(() => [ReplyVote])
  @OneToMany(() => ReplyVote, (replyvote) => replyvote.user)
  replyvotes: ReplyVote[]

  @Field(() => String)
  @CreateDateColumn({ type: 'date' })
  createdAt: Date

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date
}
