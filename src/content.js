// Use jsPDF from the UMD bundle
const { jsPDF } = window.jspdf;

// Create and inject the buttons
function createButtons() {
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'behance2pdf-button-container';
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '80px';
  buttonContainer.style.right = '20px';
  buttonContainer.style.zIndex = '9999';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';

  // PDF Button
  const pdfButton = document.createElement('button');
  pdfButton.className = 'behance2pdf-button';
  pdfButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
    Save as PDF
  `;

  // Images Button
  const imagesButton = document.createElement('button');
  imagesButton.className = 'behance2pdf-button';
  imagesButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
    Download Images
  `;

  buttonContainer.appendChild(pdfButton);
  buttonContainer.appendChild(imagesButton);
  document.body.appendChild(buttonContainer);

  return { pdfButton, imagesButton };
}

// Get highest resolution image URL from srcset
function getHighestResolutionUrl(srcset) {
  if (!srcset) return null;
  
  const sources = srcset.split(',').map(src => {
    const [url, density] = src.trim().split(' ');
    const dpi = density ? parseFloat(density.replace('x', '')) : 1;
    return { url, dpi };
  });
  
  // Sort by DPI and get highest resolution
  const highestRes = sources.sort((a, b) => b.dpi - a.dpi)[0];
  return highestRes ? highestRes.url : null;
}

// Get all high-resolution image URLs from the page
function getProjectImages() {
  const projectModules = document.querySelectorAll('.ImageElement-root-kir, .ImageElement-blockPointerEvents-Rkg');
  console.log(`Found ${projectModules.length} project modules`);
  
  const images = [];
  projectModules.forEach((module, index) => {
    const img = module.querySelector('img');
    if (img) {
      const highResUrl = getHighestResolutionUrl(img.srcset) || 
                        img.dataset.hiRes ||
                        img.dataset.highRes ||
                        img.src.replace('_webp', '').replace('1400', 'max_3840');
      
      // Extract file extension from URL
      const extension = highResUrl.split('.').pop().split('?')[0];
      
      // Create a filename based on index and extension
      const filename = `image_${String(index + 1).padStart(3, '0')}.${extension}`;
      
      images.push({ url: highResUrl, filename });
    }
  });
  
  return images;
}

// Download an image and return as blob
async function downloadImage(url) {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      headers: {
        'Origin': window.location.origin
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.blob();
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Create and download zip file with images
async function downloadImagesAsZip(button) {
  try {
    // Update button state
    button.classList.add('behance2pdf-loading');
    button.disabled = true;
    button.textContent = 'Preparing Images...';

    // Get project title for zip filename
    const titleElement = document.querySelector('[data-id="project-title"]') || 
                        document.querySelector('.Project-title');
    const projectTitle = titleElement ? titleElement.textContent.trim() : 'behance_project';
    
    // Get all image URLs
    const images = getProjectImages();
    if (!images.length) {
      throw new Error('No images found in the project');
    }

    // Create new zip file
    const zip = new JSZip();
    
    // Download each image and add to zip
    let completed = 0;
    await Promise.all(images.map(async ({ url, filename }) => {
      try {
        const imageBlob = await downloadImage(url);
        zip.file(filename, imageBlob);
        completed++;
        button.textContent = `Downloading... ${Math.round((completed / images.length) * 100)}%`;
      } catch (error) {
        console.error(`Failed to download image: ${url}`, error);
      }
    }));

    // Generate zip file
    button.textContent = 'Creating Zip File...';
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Create download link and trigger download
    const zipUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_images.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(zipUrl);

    // Reset button state
    button.classList.remove('behance2pdf-loading');
    button.disabled = false;
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      Download Images
    `;
  } catch (error) {
    console.error('Error in downloadImagesAsZip:', error);
    alert('Error downloading images: ' + error.message);
    
    // Reset button state
    button.classList.remove('behance2pdf-loading');
    button.disabled = false;
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      Download Images
    `;
  }
}

// Main function to handle PDF generation
async function handlePDFGeneration(button) {
  try {
    console.log('Starting PDF generation process...');
    
    // Add loading state
    button.classList.add('behance2pdf-loading');
    button.disabled = true;
    button.textContent = 'Generating PDF...';

    // Get project title
    const titleElement = document.querySelector('[data-id="project-title"]') || 
                        document.querySelector('.Project-title');
    const projectTitle = titleElement ? titleElement.textContent.trim() : 'behance_project';
    console.log('Project title:', projectTitle);

    // Get all images
    const images = getProjectImages();
    if (!images.length) {
      throw new Error('No images found in the project');
    }

    // Dynamically get jsPDF from html2pdf bundle (already loaded)
    const jsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPDF) throw new Error('jsPDF not found.');

    // A4 size in mm
    const pageWidth = 210;
    const pageHeight = 297;

    // Create a new PDF
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

    for (let i = 0; i < images.length; i++) {
      const { url } = images[i];
      // Fetch image as data URL
      const response = await fetch(url);
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      // Create an image to get its dimensions
      const img = document.createElement('img');
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      let imgWidth = img.naturalWidth;
      let imgHeight = img.naturalHeight;

      // Validate image dimensions
      if (!imgWidth || !imgHeight || isNaN(imgWidth) || isNaN(imgHeight) || imgWidth <= 0 || imgHeight <= 0) {
        console.warn(`Skipping image due to invalid dimensions: ${url}`);
        continue;
      }

      // Calculate dimensions to fit A4 while preserving aspect ratio
      let ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      let pdfWidth = imgWidth * ratio;
      let pdfHeight = imgHeight * ratio;
      let x = (pageWidth - pdfWidth) / 2;
      let y = (pageHeight - pdfHeight) / 2;

      if (i > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', x, y, pdfWidth, pdfHeight);
    }

    pdf.save(`${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);

    // Reset button state
    button.classList.remove('behance2pdf-loading');
    button.disabled = false;
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      Save as PDF
    `;
  } catch (error) {
    console.error('Error in handlePDFGeneration:', error);
    alert('Error generating PDF: ' + error.message);
    
    // Reset button state
    button.classList.remove('behance2pdf-loading');
    button.disabled = false;
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      Save as PDF
    `;
  }
}

// Initialize the extension
function init() {
  console.log('Initializing Behance2PDF extension...');
  
  // Only run on project pages
  if (!window.location.pathname.includes('/gallery/')) {
    console.log('Not a project page, skipping initialization');
    return;
  }

  // Create and inject the buttons
  const { pdfButton, imagesButton } = createButtons();
  console.log('Buttons created and injected');

  // Add click handlers
  pdfButton.addEventListener('click', () => handlePDFGeneration(pdfButton));
  imagesButton.addEventListener('click', () => downloadImagesAsZip(imagesButton));
}

// Run initialization
init(); 