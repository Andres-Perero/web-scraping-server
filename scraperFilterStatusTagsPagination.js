const puppeteer = require("puppeteer");

// Función para realizar el web scraping de los filtros de estado
const scraperFilterStatusTagsPagination = async () => {
  try {
    console.log("Actualizando datos de los filtros de etiquetas...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("https://www.manhwas.net/biblioteca");
    await page.waitForSelector(".form-group"); // Espera hasta que el elemento .form-group esté disponible

    // Selecciona el segundo formulario de filtro (estado)
    const filterBxStatus = (await page.$$(".form-group"))[0];
    const selectElementStatus = await filterBxStatus.$(
      ".form-control.custom-select"
    ); // Selecciona el elemento <select>

    const filterOptionsStatus = await selectElementStatus.evaluate((select) => {
      const options = Array.from(select.querySelectorAll("option"));
      return options
        .filter((option) => option.value)
        .map((option) => ({
          value: option.value,
          text: option.textContent.trim(),
        }));
    });

    // Selecciona el segundo formulario de filtro (etiquetas)
    const filterBxTags = (await page.$$(".form-group"))[1];
    const selectElementTags = await filterBxTags.$(
      ".form-control.custom-select"
    ); // Selecciona el elemento <select>

    const filterOptionsTags = await selectElementTags.evaluate((select) => {
      const options = Array.from(select.querySelectorAll("option"));
      return options
        .filter((option) => option.value)
        .map((option) => ({
          value: option.value,
          text: option.textContent.trim(),
        }));
    });
    await page.waitForSelector(".pagination"); // Espera hasta que el elemento .pagination esté disponible
    const paginationElement = await page.$(".pagination"); // Selecciona el elemento de paginación

    const linkElements = await paginationElement.$$("a"); // Selecciona todos los elementos <a> dentro de .pagination

    let highestPageLink = { href: "", value: 0 };

    for (const link of linkElements) {
      const href = await link.evaluate((a) => a.getAttribute("href"));
      const text = await link.evaluate((a) => a.textContent);
      const pageValue = parseInt(text);

      if (!isNaN(pageValue) && pageValue > highestPageLink.value) {
        highestPageLink = { href, value: pageValue };
      }
    }
    await browser.close();
    // Retornar un objeto con los valores
    return {
      filterOptionsStatus,
      filterOptionsTags,
      highestPageLink,
    };
  } catch (error) {
    console.error("Error al actualizar los datos de los filtros:", error);
  }
};
module.exports = { scraperFilterStatusTagsPagination };
