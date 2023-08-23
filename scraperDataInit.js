const puppeteer = require("puppeteer");

// Función para realizar el web scraping
const scrapeData = async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://manhwas.net/esp");
    await page.waitForSelector("body");

    // Extraer los datos de las secciones y los artículos de la página
    const sectionElements = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll("section"));

      return sections.reduce((acc, section) => {
        const header = section.querySelector(".header");
        const titleElement = header.querySelector(".title");
        const linkElement = header.querySelector("a[href]");

        const articles = Array.from(section.querySelectorAll("ul li article"));
        const articlesData = articles.map((article) => {
          // Extraer los datos de cada artículo individual
          const link = article.querySelector("a[href]");
          const img = article.querySelector("img[src]");
          const title = article.querySelector(".title");
          const timestamp = article.querySelector(".text-secondary");
          const chapterNumberElement =
            article.querySelector(".anime-type-peli");
          const typeElement = article.querySelector(".anime-badge");

          return {
            link: link ? link.href : "",
            img: img ? img.src : "",
            title: title ? title.textContent.trim() : "",
            timestamp: timestamp ? timestamp.textContent.trim() : "",
            chapterNumber: chapterNumberElement
              ? chapterNumberElement.textContent.trim()
              : "",
            type: typeElement ? typeElement.textContent.trim() : "",
          };
        });

        if (articlesData.length > 0) {
          // Agregar la sección solo si tiene artículos
          acc.push({
            sectionTitle: titleElement ? titleElement.textContent.trim() : "",
            sectionLink: linkElement ? linkElement.href : "",
            articles: articlesData,
          });
        }

        return acc;
      }, []);
    });

    await browser.close();
    return sectionElements;
  } catch (error) {
    console.error("Error en el web scraping:", error);
    throw error;
  }
};

module.exports = { scrapeData };
