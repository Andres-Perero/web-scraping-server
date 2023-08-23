// Importar las bibliotecas necesarias
const express = require("express");
const fs = require("fs");
const cron = require("node-cron");
const puppeteer = require("puppeteer");
const { scrapeData } = require("./scraperDataInit");
const {
  scraperFilterStatusTagsPagination,
} = require("./scraperFilterStatusTagsPagination");
const { scraperLibrary } = require("./scraperSeries");
const { scraperSerieDetails } = require("./scraperSerieDetails");

const paginacion = require("./resources/pagination.json");

// Crear una instancia de la aplicación Express
const app = express();

// Definir el puerto en el que se ejecutará el servidor, utilizando el puerto 3000 si no se especifica
const PORT = process.env.PORT || 3000;

// Función para guardar los datos de las secciones en un archivo JSON
const saveDataToFile = (sections, type) => {
  // Escribir los datos en el archivo "sections.json" con formato JSON y un espaciado de 2
  fs.writeFile(
    ".\\resources\\" + type,
    JSON.stringify(sections, null, 2),
    (err) => {
      if (err) {
        console.error("Error al guardar datos de las secciones:", err);
      } else {
        console.log("Datos de las secciones guardados correctamente.");
      }
    }
  );
};

// Programar una tarea para actualizar los datos cada diez minutos */10
cron.schedule("*/50 * * * *", async () => {
  try {
    console.log("Actualizando datos...");
    const sectionElements = await scrapeData();
    saveDataToFile(sectionElements, "sections.json");
  } catch (error) {
    console.error("Error al actualizar los datos:", error);
  }
});

// Configurar una ruta para obtener los datos almacenados en el archivo JSON
app.get("/sections", (req, res) => {
  fs.readFile(".\\resources\\sections.json", "utf8", (err, data) => {
    if (err) {
      console.error("Error al obtener los datos:", err);
      res.status(500).json({ error: "Error al obtener los datos" });
    } else {
      // Enviar los datos almacenados en el archivo JSON como respuesta
      res.json(JSON.parse(data));
    }
  });
});

// Ruta para obtener los datos de los filtros de estado
app.get("/filters-status-tags-pagination", async (req, res) => {
  try {
    const { filterOptionsStatus, filterOptionsTags, highestPageLink } =
      await scraperFilterStatusTagsPagination();
    saveDataToFile(filterOptionsStatus, "filters-status.json");
    saveDataToFile(filterOptionsTags, "filters-tags.json");
    saveDataToFile(highestPageLink, "pagination.json");
    // Envía el objeto con todos los datos en la respuesta
    res.json({
      filterOptionsStatus,
      filterOptionsTags,
      highestPageLink,
    });
  } catch (error) {
    console.error("Error al obtener los datos de filtros de estado:", error);
    res
      .status(500)
      .json({ error: "Error al obtener los datos de filtros de estado" });
  }
});

app.get("/series-page1", async (req, res) => {
  try {
    const totalPages = 1;
    const SeriesPage1 = await scraperLibrary(totalPages);
    saveDataToFile(SeriesPage1, "series-page1.json");
    res.json(SeriesPage1);
  } catch (error) {
    console.error("Error al obtener los datos de filtros de estado:", error);
    res
      .status(500)
      .json({ error: "Error al obtener los datos de filtros de estado" });
  }
});

app.get("/series", async (req, res) => {
  try {
    const totalPages = paginacion.value;
    const SeriesPage1 = await scraperLibrary(totalPages);
    saveDataToFile(SeriesPage1, "series.json");
    res.json(SeriesPage1);
  } catch (error) {
    console.error("Error al obtener los datos de filtros de estado:", error);
    res
      .status(500)
      .json({ error: "Error al obtener los datos de filtros de estado" });
  }
});

app.get("/series-details", async (req, res) => {
  //unificar la data... hacer todos los pasos en una sola,
  try {
    const seriesListData = fs.readFileSync(
      ".\\resources\\series-page1.json",
      "utf8"
    );
    const seriesList = JSON.parse(seriesListData);

    const seriesDetailsList = [];
    for (const series of seriesList) {
      const details = await scraperSeriesDetails(series.link);
      seriesDetailsList.push({ ...series, details });
    }

    saveDataToFile(seriesDetailsList, "series-details.json");
    res.json(seriesDetailsList);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Error al obtener los detalles de las series" });
  }
});

app.get("/serie-detail", async (req, res) => {
  const linkUrl = req.query.url;
  try {
    const details = await scraperSerieDetails(linkUrl);
    res.json(details);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Error al obtener los detalles de las series" });
  }
});

app.get("/scraper-chapter", async (req, res) => {
  const linkUrl = req.query.url;

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(linkUrl);

    // Realiza el scraping de los datos que necesitas
    const scrapedData = await page.evaluate(() => {
      const titleElement = document.querySelector(".anime-title.text-center");
      const title = titleElement.textContent.trim();

      const episodeNavLinks = document.querySelectorAll(".episodes-nav a");
      const previousEpisodeLink =
        Array.from(episodeNavLinks)
          .find((link) =>
            link.innerHTML.includes('<i class="fa-arrow-left"></i>')
          )
          ?.getAttribute("href") || "";
      const nextEpisodeLink =
        Array.from(episodeNavLinks)
          .find((link) =>
            link.innerHTML.includes('<i class="fa-arrow-right"></i>')
          )
          ?.getAttribute("href") || "";

      const chapterImageElements =
        document.querySelectorAll("#chapter_imgs img");
      const imageUrls = Array.from(chapterImageElements).map((img) => img.src);

      return {
        title: title,
        previousEpisodeLink: previousEpisodeLink,
        nextEpisodeLink: nextEpisodeLink,
        imageUrls: imageUrls,
      };
    });

    await browser.close();
    res.json(scrapedData);
  } catch (error) {
    console.error("Error en el scraping del enlace:", error);
    res.status(500).json({ error: "Error en el scraping del enlace" });
  }
});
// Iniciar el servidor Express en el puerto especificado
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
