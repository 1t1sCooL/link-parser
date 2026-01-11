import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import { MongoClient } from "mongodb";

const url = "https://kadikama.com/page/";
const cartoonsLinks = [];
let count = 1;
const mongoUrl = process.env.MONGO_URI;

const dbName = "kadikama";

console.time("fetchCartoons");

async function getMaxPages() {
  try {
    const { data } = await axios.get(`${url}${count}`);
    const $ = cheerio.load(data);

    const pages = $("#dle-content .navigation a")
      .map((_, el) => $(el).text())
      .get();
    if (pages.length < 2) {
      throw new Error(`Couldn't determine the number of pages`);
    }
    return parseInt(pages[pages.length - 2], 10);
  } catch (error) {
    console.error("Error in determining the number of pages:", error.message);
    throw error;
  }
}

async function fetchCartoons() {
  let client = null;

  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log("Connection to MongoDB is successful");
    const db = client.db(dbName);
    const collection = db.collection("Links");

    const maxPages = await getMaxPages();
    console.log(`Pages detected: ${maxPages}`);

    while (count <= maxPages) {
      console.log(`Page processing: ${count}`);
      const { data } = await axios.get(`${url}${count}`);
      const $ = cheerio.load(data);

      $("#dle-content a").each((index, element) => {
        const link = $(element).attr("href");
        if (link && link.endsWith(".html") && link.startsWith("http")) {
          cartoonsLinks.push(link);
        }
      });

      count++;
    }

    console.log(`Total links collected: ${cartoonsLinks.length}`);

    if (cartoonsLinks.length > 0) {
      for (const link of cartoonsLinks) {
        const existingLink = await collection.findOne({ link });

        if (!existingLink) {
          await collection.insertOne({ link });
          console.log(`Added new link: ${link}`);
        } else {
          console.log(`Link already exists: ${link}`);
        }
      }
    }

    await fs.writeFile("links.json", JSON.stringify(cartoonsLinks, null, 2));
    console.log("Links are saved in links.json");
  } catch (error) {
    await fs.writeFile("links2.json", JSON.stringify(cartoonsLinks, null, 2));
    console.error("Error during parsing:", error.message);
  } finally {
    if (client) {
      await client.close();
      console.log("Connection to MongoDB is closed");
    }
    console.timeEnd("fetchCartoons");
  }
}

fetchCartoons();
