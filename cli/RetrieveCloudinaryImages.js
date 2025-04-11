const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Configure Cloudinary
cloudinary.config({
  //Please enter the config, ask web team for these essential information.
  cloud_name: '{Cloud_Id}',
  api_key: '{API_KEY}',
  api_secret: '{API_SECRET}'
});

async function main() {
  //Indicate the folder name on Cloudinary
  const folderName = 'tw-2025-general-nature-photo-contest_event';
  console.log(`Retrieving all images from folder: ${folderName}`);
  //Get images from cloudinary
  const images = await getAllImagesFromFolder(folderName);
  
  //Save result to csv file
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const fileName = `cloudinary-images_${timestamp}.csv`

  if (images.length > 0) {
    console.log(`Total images retrieved: ${images.length}`);
    await saveToCsv(images, fileName);
  } else {
    console.log('No images found in the specified folder.');
  }
}

main();

async function getAllImagesFromFolder(folderName) {
  let allImages = [];
  let nextCursor = null;
  const maxResults = 500; // Maximum allowed by Cloudinary per request

  do {
    try {
      const result = await cloudinary.search
        .expression(`folder:${folderName}`)
        .max_results(maxResults)
        .next_cursor(nextCursor)
        .execute();

      allImages = allImages.concat(result.resources);
      nextCursor = result.next_cursor;
      console.log(`Retrieved ${result.resources.length} images. Total: ${allImages.length}`);
    } catch (error) {
      console.error('Error retrieving images:', error);
      break;
    }
  } while (nextCursor);

  return allImages;
}

async function saveToCsv(data, filename) {
  const csvWriter = createCsvWriter({
    path: filename,
    header: [
      {id: 'public_id', title: 'Public ID'},
      {id: 'format', title: 'Format'},
      {id: 'version', title: 'Version'},
      {id: 'resource_type', title: 'Resource Type'},
      {id: 'type', title: 'Type'},
      {id: 'created_at', title: 'Created At'},
      {id: 'bytes', title: 'Size (bytes)'},
      {id: 'width', title: 'Width'},
      {id: 'height', title: 'Height'},
      {id: 'url', title: 'URL'},
      {id: 'secure_url', title: 'Secure URL'}
    ]
  });

  try {
    await csvWriter.writeRecords(data);
    console.log(`CSV file ${filename} has been created successfully.`);
  } catch (error) {
    console.error('Error writing CSV:', error);
  }
}

