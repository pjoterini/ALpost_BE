import { ApolloServer } from 'apollo-server-express'
import cors from 'cors'
import 'dotenv-safe/config'
import express from 'express'
import session from 'express-session'
import Redis from 'ioredis'
import path from 'path'
import 'reflect-metadata'
import { buildSchema } from 'type-graphql'
import { DataSource } from 'typeorm'
import { COOKIE_NAME, __prod__ } from './constants'
import { Post } from './entities/Post'
import { Reply } from './entities/Reply'
import { ReplyVote } from './entities/ReplyVote'
import { User } from './entities/User'
import { Vote } from './entities/Vote'
import { PostResolver } from './resolvers/post'
import { ReplyResolver } from './resolvers/reply'
import { UserResolver } from './resolvers/user'
import { VoteResolver } from './resolvers/vote'
import { createUserLoader } from './utils/createUserLoader'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  // database: "alpost",
  // username: "postgres",
  // password: `${process.env.POSTGRES_PASSWORD}`,
  url: process.env.POSTGRES_URL,
  logging: true,
  synchronize: true,
  // synchronize: __prod__ ? false : true,
  entities: [Post, User, Vote, ReplyVote, Reply],
  migrations: [path.join(__dirname, './migrations/*')]
})

const main = async () => {
  await AppDataSource.initialize()
    .then(() => {
      console.log('TypeORM initialized')
    })
    .catch((error) => console.error(error, 'TypeORM initialization failed'))
  // await AppDataSource.runMigrations();

  // await ReplyVote.delete({});
  // await Vote.delete({});
  // await Post.delete({});
  // await Reply.delete({});
  // await User.delete({});

  const app = express()

  let RedisStore = require('connect-redis')(session)
  const redis = new Redis(process.env.REDIS_URL)
  if (!redis.status) {
    await redis.connect()
  }

  app.set('trust proxy', 1)
  app.use(
    cors({
      origin: [process.env.CORS_ORIGIN],
      credentials: true
    })
  )

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redis, disableTouch: true }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: __prod__ ? 'none' : 'lax',
        secure: __prod__,
        domain: __prod__ ? '.up.railway.app' : undefined
      },
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET,
      resave: false
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [PostResolver, VoteResolver, UserResolver, ReplyResolver],
      validate: false
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader()
    })
  })

  await apolloServer.start()

  apolloServer.applyMiddleware({
    app,
    cors: false
  })

  const port = process.env.PORT || 'http://localhost:4000'
  app.listen(parseInt(port), () => {
    console.log(`server started on ${port}`)
  })
}

main()
