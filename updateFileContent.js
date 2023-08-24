// Importar las bibliotecas necesarias
const { google } = require("googleapis");
const data_key = require("./data-googleapis/storage-web-scraping-396800-96043ff114f4.json");
const {
  getDataGD,
  readFileContentFromDrive,
} = require("./readFileContentFromDrive");
const { uploadFileToDrive } = require("./uploadFileToDrive");

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
// Modificar el contenido de un archivo en Google Drive por su ID
async function updateFileContent(fileId, newContent) {
  const drive = google.drive({ version: "v3", auth });
  try {
    const media = {
      mimeType: "application/json",
      body: newContent,
    };
    const response = await drive.files.update({
      fileId,
      media: media,
    });
    console.log("Archivo actualizado en Google Drive. ID:", response.data.id);
  } catch (error) {
    console.error(
      "Error al actualizar el archivo en Google Drive:",
      error.message
    );
  }
}

async function updateDataGD(folderId, filename, newContent) {
  try {
    const file = await findFileInFolder(folderId, filename);
    if (file) {
      console.log("Archivo encontrado:", file.name);
      await updateFileContent(file.id, newContent);
    } else {
      await uploadFileToDrive(folderId, filename, newContent);
      return newContent;
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function updateSeriesGD(folderId, filename, newContent) {
  try {
    const file = await findFileInFolder(folderId, filename);
    if (file) {
      console.log("Archivo encontrado:", file.name);
      const readfile = readFileContentFromDrive(file.id);
      await updateFileContent(file.id, newContent);
      return readfile;
    } else {
      await uploadFileToDrive(
        folderId,
        filename,
        JSON.stringify(newContent, null, 2)
      );
      return newContent;
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
module.exports = { updateDataGD, updateSeriesGD };
