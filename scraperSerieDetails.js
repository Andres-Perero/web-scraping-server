const puppeteer = require("puppeteer");

const scraperSerieDetails = async (link) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(link);
    await page.waitForSelector(".title");

    const seriesDetails = await page.evaluate(() => {
      const title = document.querySelector(".title").textContent.trim();
      const type = document
        .querySelector(".anime-type-peli")
        .textContent.trim();
      const status = document
        .querySelector(".anime-type-peli:nth-child(2)")
        .textContent.trim();
      const genres = Array.from(document.querySelectorAll(".genres a")).map(
        (genre) => genre.textContent.trim()
      );
      const synopsis = document.querySelector(".sinopsis").textContent.trim();
      const views = parseInt(
        document.querySelector("#score").textContent.trim()
      );

      // Extract episode details
      const episodes = Array.from(
        document.querySelectorAll(".episodes-list li")
      ).map((episode) => {
        const link = episode.querySelector("a").href;
        const chapter = episode.querySelector("p span").textContent.trim();
        return { chapter, link };
      });

      return { title, type, status, genres, synopsis, views, episodes };
    });

    await browser.close();
    return seriesDetails;
  } catch (error) {
    console.error("Error en el scraping del enlace:", error);
    res.status(500).json({ error: "Error en el scraping del enlace" });
  }
};

module.exports = { scraperSerieDetails };
