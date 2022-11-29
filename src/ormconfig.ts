import "dotenv-safe/config";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import path from "path";
import { Updoot } from "./entities/Updoot";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  // database: "alpost",
  // username: "postgres",
  // password: `${process.env.SQL_PASSWORD}`,
  url: process.env.DATABASE_URL,
  logging: true,
  // synchronize: true,
  entities: [Post, User, Updoot],
  migrations: [path.join(__dirname, "./migrations/*")],
});
