// Importar las bibliotecas necesarias
const express = require("express");
const fs = require("fs");
const cron = require("node-cron");
const puppeteer = require("puppeteer");
//donde se realiza el scraper de las series recien agregadas
const { scrapeData } = require("./scraperDataInit");
//donde se realiza el scraper de la biblioteca, status, tags, paginacion
const {
  scraperFilterStatusTagsPagination,
} = require("./scraperFilterStatusTagsPagination");
//donde se realiza el scraper de la biblioteca, se saca la info de cada paginacion y se hace un array de todas las series
const { scraperLibrary } = require("./scraperSeries");
//ojo, revisar este scraperSerieDetails
//donde se realiza el scraper de cada serie y se guarda en un archivo invidiviar por cada uno
const { scraperSerieDetails } = require("./scraperSerieDetails");

// etiquetas para hacer el scraper
const rsc_library = require("./resources/library.json");
// nombre de las carpetas donde se aloja la informacion
const folders = require("./data-googleapis/route-rsc-files.json");
//funciones para realizar a la base de datos
const {
  getDataGD,
  getAllFilesInFolder,
} = require("./readFileContentFromDrive");
const { updateDataGD, updateSeriesGD } = require("./updateFileContent");

// Crear una instancia de la aplicación Express
const app = express();

// Definir el puerto en el que se ejecutará el servidor, utilizando el puerto 3000 si no se especifica
const PORT = process.env.PORT || 3000;

// Función para actualizar los datos de las secciones en un archivo JSON en el Storage de Google drive
const saveUpdateDataToFile = (folder, filename, data) => {
  try {
    updateDataGD(folder, filename, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error al guardar los datos en Google Drive:", error.message);
  }
};

// Programar una tarea para actualizar los datos cada diez minutos */10
cron.schedule("0 */2 * * *", async () => {
  try {
    console.log("Actualizando datos...");
    const sectionElements = await scrapeData();
    saveUpdateDataToFile(
      folders.sections,
      rsc_library.sections,
      sectionElements
    );
    // Iterar a través de las series y obtener y guardar los detalles
    for (const section of sectionElements) {
      for (const article of section.articles) {
        const details = await scraperSerieDetails(article.linkSerie);
        saveUpdateDataToFile(folders.dataSeriesDetails, article.title, details);
      }
    }
  } catch (error) {
    console.error("Error al actualizar los datos:", error);
  }
});

// Configurar una ruta para obtener los datos almacenados en el archivo JSON
app.get("/sections", async (req, res) => {
  const sections = await getDataGD(folders.sections, rsc_library.sections);
  // for (const section of sections) {
  //   for (const article of section.articles) {
  //     const details = await scraperSerieDetails(article.linkSerie);

  //     saveUpdateDataToFile(
  //       folders.dataSeriesDetails,
  //       article.title,
  //       details
  //     );
  //   }
  // }
  res.json(sections);
});

// Ruta para obtener los datos de los filtros de estado
app.get("/filters-status-tags-pagination", async (req, res) => {
  try {
    const { filterOptionsStatus, filterOptionsTags, highestPageLink } =
      await scraperFilterStatusTagsPagination();
    saveUpdateDataToFile(
      filterOptionsStatus,
      rsc_library.filterStatus,
      folders.resourcesWebScraping
    );
    saveUpdateDataToFile(
      filterOptionsTags,
      rsc_library.filterTags,
      folders.resourcesWebScraping
    );
    saveUpdateDataToFile(
      highestPageLink,
      rsc_library.pagination,
      folders.resourcesWebScraping
    );
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

app.get("/series", async (req, res) => {
  try {
    const paginationSeries = await getDataGD(
      folders.resourcesWebScraping,
      rsc_library.pagination
    );
    const totalPages = paginationSeries.value;
    const SeriesPages = await scraperLibrary(totalPages);

    const previousData = await updateSeriesGD(
      folders.dataSeries,
      rsc_library.series,
      JSON.stringify(SeriesPages, null, 2)
    );

    // Filtrar los nuevos elementos por link
    const newSeries = SeriesPages.filter(
      (newItem) =>
        !previousData.some((oldItem) => oldItem.link === newItem.link)
    );
    for (const series of newSeries) {
      const details = await scraperSerieDetails(series.link);
      saveUpdateDataToFile(folders.dataSeriesDetails, series.title, details);
    }
    res.json(newSeries);
  } catch (error) {
    console.error("Error al obtener los datos de filtros de estado:", error);
    res
      .status(500)
      .json({ error: "Error al obtener los datos de filtros de estado" });
  }
});

app.get("/series-details", async (req, res) => {
  try {
    const seriesListData = await getDataGD(
      folders.dataSeries,
      rsc_library.series
    );
    const listFolderGD = await getAllFilesInFolder(folders.dataSeriesDetails);

    // Filtrar los nuevos elementos por link
    const newSeries = seriesListData.filter(
      (newItem) =>
        !listFolderGD.some((oldItem) => oldItem.name === newItem.title)
    );
    for (const series of newSeries) {
      const details = await scraperSerieDetails(series.link);
      saveUpdateDataToFile(folders.dataSeriesDetails, series.title, details);
    }
    res.json(newSeries);
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
