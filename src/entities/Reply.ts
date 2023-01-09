import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Post } from "./Post";
import { Replyupdoot } from "./Replyupdoot";
import { User } from "./User";

@ObjectType()
@Entity()
export class Reply extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  text!: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points!: number;

  @Field(() => Int, { nullable: true })
  voteStatus: number | null;

  @Field(() => Int)
  @Column({ type: "int" })
  postid: number;

  @Field(() => Post)
  @ManyToOne(() => Post, (post) => post.replies)
  post: Post;

  @Field()
  @Column()
  creatorId: number;

  @Field()
  @ManyToOne(() => User, (user) => user.replies)
  creator: User;

  @Field(() => [Replyupdoot])
  @OneToMany(() => Replyupdoot, (replyupdoot) => replyupdoot.reply)
  updoots: Replyupdoot[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
