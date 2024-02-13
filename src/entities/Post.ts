import { Field, Int, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { Reply } from './Reply'
import { Vote } from './Vote'
import { User } from './User'

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number

  @Field()
  @Column()
  title!: string

  @Field()
  @Column()
  text!: string

  @Field()
  @Column({ type: 'int', default: 0 })
  points!: number

  @Field(() => Int, { nullable: true })
  voteStatus: number | null

  @Field()
  @Column()
  creatorId: number

  @Field()
  @ManyToOne(() => User, (user) => user.posts)
  creator: User

  @Field(() => [Reply])
  @OneToMany(() => Reply, (reply) => reply.post)
  replies: Reply[]

  @OneToMany(() => Vote, (vote) => vote.post)
  votes: Vote[]

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field()
  @Column()
  category!: string
}
