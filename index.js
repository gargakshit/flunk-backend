const path = require("path");
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.join(__dirname, "db_00.sqlite3"),
  },
});
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const main = async () => {
  await knex.raw(
    `
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(256) UNIQUE,
        score INTEGER
      );
    `
  );

  const app = express();

  app.use(express.json());

  app.post("/", async (req, res) => {
    const { score, username } = req.body;

    if (score && username) {
      try {
        await knex("scores").insert({
          username,
          score: Number(score),
        });
      } catch (e) {
        await knex("scores")
          .where({
            username,
          })
          .update({
            score: Number(score),
          });
      }

      const [s] = await knex("scores")
        .where("score", ">", Number(score))
        .countDistinct("score");

      res.send(`${s["count(distinct `score`)"] + 1}`);
    } else {
      res.status(400).send("Bad Request");
    }
  });

  app.listen(process.env.PORT, () =>
    console.log(`Started on :${process.env.PORT}`)
  );
};

main();
