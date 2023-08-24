const puppeteer = require("puppeteer");

const scraperSeries = async (pageNumber) => {
  const browser = await puppeteer.launch({ timeout: 60000 }); // Aumenta el tiempo a 60 segundos

  const page = await browser.newPage();

  const url = `https://www.manhwas.net/biblioteca?page=${pageNumber}`;
  // Aumentar el tiempo de espera a 60 segundos (60000 ms)
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  //await page.goto(url);
  await page.waitForSelector(".anime"); // Esperar a que los elementos estén disponibles

  const items = await page.evaluate(() => {
    const itemElements = Array.from(document.querySelectorAll(".anime"));
    return itemElements.map((itemElement) => {
      // Extraer la información relevante del elemento
      const title = itemElement.querySelector(".title").textContent.trim();
      const type = itemElement.querySelector(".anime-badge").textContent.trim();
      const link = itemElement.querySelector("a").getAttribute("href");
      const image = itemElement.querySelector("img").getAttribute("src");

      return { title, type, link, image };
    });
  });

  await browser.close();
  return items;
};

const scraperLibrary = async (totalPages) => {
  const allItems = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const itemsOnPage = await scraperSeries(pageNumber);
    allItems.push(...itemsOnPage);
  }

  return allItems;
};

module.exports = { scraperLibrary };
