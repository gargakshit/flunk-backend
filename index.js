const path = require("path");
const knex = require("knex")({
  client: "sqlite3",
  connection: {
    filename: path.join(__dirname, "db_00.sqlite3"),
  },
});
const express = require("express");
const dotenv = require("dotenv");
const puppeteer = require("puppeteer");
const Redis = require("ioredis");

dotenv.config();

const main = async () => {
  const redis = new Redis();

  const browser = await puppeteer.launch({
    headless: true,
  });

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
  app.use(express.urlencoded({ extended: true }));

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

  app.get("/bg", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      res.status(400).send("Bad Request");
    } else {
      const base = Buffer.from(url.toString()).toString("base64");
      const cache = await redis.get(`flunk:cache:${base}`);

      if (cache) {
        res.send(cache);
      } else {
        const page = await browser.newPage();
        await page.goto("https://www.remove.bg/");

        page.on("dialog", async (d) => {
          d.accept(url.toString());
        });

        await page.click('a[class="text-muted select-photo-url-btn"]');
        await delay(7500);
        const links = await page.$$eval("a.btn-primary", (anchors) => {
          return anchors
            .map((anchor) => anchor.getAttribute("href"))
            .slice(0, 10);
        });
        await page.close();

        if (links) {
          await redis.set(`flunk:cache:${base}`, links[0]);
          res.send(links && links[0]);
        } else {
          res.status(500).send("Server Error");
        }
      }
    }
  });

  app.listen(process.env.PORT, () =>
    console.log(`Started on :${process.env.PORT}`)
  );
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

main();
