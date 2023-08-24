const { google } = require("googleapis");
const data_key = require("./data-googleapis/storage-web-scraping-396800-96043ff114f4.json");

// Configurar la autenticación para la cuenta de servicio
const auth = new google.auth.GoogleAuth({
  credentials: data_key,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

// Buscar el archivo por su nombre y en una carpeta específica
async function findFileInFolder(folderId, filename) {
  const drive = google.drive({ version: "v3", auth });
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name = '${filename}'`,
    });

    if (response.data.files.length > 0) {
      return response.data.files[0];
    } else {
      console.log("Archivo no encontrado en la carpeta.");
      return null;
    }
  } catch (error) {
    console.error("Error al buscar el archivo:", error.message);
    return null;
  }
}

// Leer el contenido de un archivo en Google Drive por su ID
async function readFileContentFromDrive(fileId) {
  const drive = google.drive({ version: "v3", auth });
  try {
    const response = await drive.files.get({ fileId, alt: "media" });
    return response.data;
  } catch (error) {
    console.error("Error al leer el contenido del archivo:", error.message);
    return null;
  }
}

// Llama a la función utilizando async/await
async function getDataGD(folderId, filename) {
  try {
    const file = await findFileInFolder(folderId, filename);
    if (file) {
      const content = await readFileContentFromDrive(file.id);
      if (content) {
        return content;
      }
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// Obtener todos los elementos (archivos) de una carpeta específica en Google Drive
async function getAllFilesInFolder(folderId) {
  const drive = google.drive({ version: "v3", auth });
  const pageSize = 100; // Cantidad de archivos por página

  let allFiles = [];
  let nextPageToken = null;

  try {
    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents`,
        pageSize: pageSize,
        pageToken: nextPageToken,
      });

      const filesInPage = response.data.files;
      allFiles = allFiles.concat(filesInPage);
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    return allFiles;
  } catch (error) {
    console.error(
      "Error al obtener los archivos de la carpeta:",
      error.message
    );
    return [];
  }
}

module.exports = { getDataGD, readFileContentFromDrive, getAllFilesInFolder };
