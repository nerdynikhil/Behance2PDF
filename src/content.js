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

// Helper to get normalized project name
function getNormalizedProjectName() {
  // Try to extract from <title> tag
  const titleTag = document.title;
  if (titleTag && titleTag.includes(':: Behance')) {
    const projectName = titleTag.split(':: Behance')[0].trim();
    if (projectName) {
      return projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
  }
  // Fallback to previous logic
  const titleElement = document.querySelector('[data-id="project-title"]') || 
                      document.querySelector('.Project-title');
  const projectTitle = titleElement ? titleElement.textContent.trim() : 'behance_project';
  return projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

// Create and download zip file with images
async function downloadImagesAsZip(button) {
  try {
    // Update button state
    button.classList.add('behance2pdf-loading');
    button.disabled = true;
    button.textContent = 'Preparing Images...';

    // Use normalized project name for zip filename
    const normalizedProjectName = getNormalizedProjectName();
    
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
    link.download = `${normalizedProjectName}.zip`;
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

    // Use normalized project name for pdf filename
    const normalizedProjectName = getNormalizedProjectName();

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

    pdf.save(`${normalizedProjectName}.pdf`);

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

// Helper to show a Behance-styled message
function showBehanceMessage(message) {
  // Remove any existing message
  const existing = document.getElementById('behance2pdf-message');
  if (existing) existing.remove();

  const msg = document.createElement('div');
  msg.id = 'behance2pdf-message';
  msg.textContent = message;
  msg.style.position = 'fixed';
  msg.style.bottom = '120px';
  msg.style.right = '30px';
  msg.style.background = '#191919';
  msg.style.color = '#fff';
  msg.style.padding = '16px 28px';
  msg.style.borderRadius = '12px';
  msg.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
  msg.style.fontSize = '1rem';
  msg.style.fontWeight = '500';
  msg.style.zIndex = '10000';
  msg.style.letterSpacing = '0.01em';
  msg.style.display = 'flex';
  msg.style.alignItems = 'center';
  msg.style.gap = '10px';
  msg.style.transition = 'opacity 0.3s';
  msg.style.opacity = '1';

  // Behance blue accent bar
  const accent = document.createElement('div');
  accent.style.width = '6px';
  accent.style.height = '32px';
  accent.style.background = '#1769ff';
  accent.style.borderRadius = '6px';
  accent.style.marginRight = '16px';
  msg.prepend(accent);

  document.body.appendChild(msg);
  setTimeout(() => {
    msg.style.opacity = '0';
    setTimeout(() => msg.remove(), 400);
  }, 3000);
}

// SPA/overlay-aware button injection
function ensureButtonsInjected() {
  if (!document.querySelector('.behance2pdf-button-container')) {
    console.log('Injecting Behance2PDF buttons...');
    const { pdfButton, imagesButton } = createButtons();
    // Add click handlers
    pdfButton.addEventListener('click', () => {
      if (!window.location.pathname.includes('/gallery/')) {
        showBehanceMessage('Please open a project to use PDF export.');
        return;
      }
      handlePDFGeneration(pdfButton);
    });
    imagesButton.addEventListener('click', () => {
      if (!window.location.pathname.includes('/gallery/')) {
        showBehanceMessage('Please open a project to download images.');
        return;
      }
      downloadImagesAsZip(imagesButton);
    });
    console.log('Behance2PDF buttons injected successfully');
  } else {
    console.log('Behance2PDF buttons already exist');
  }
}

// Listen for SPA navigation (popstate, pushState, replaceState)
function listenForSpaNavigation() {
  let lastUrl = location.href;
  const checkUrlChange = () => {
    console.log('URL changed from', lastUrl, 'to', location.href);
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(ensureButtonsInjected, 500); // Increased delay for DOM update
    }
  };
  window.addEventListener('popstate', checkUrlChange);
  // Monkey-patch pushState/replaceState
  const origPushState = history.pushState;
  history.pushState = function(...args) {
    origPushState.apply(this, args);
    setTimeout(() => window.dispatchEvent(new Event('popstate')), 100);
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    origReplaceState.apply(this, args);
    setTimeout(() => window.dispatchEvent(new Event('popstate')), 100);
  };
}

// MutationObserver to catch overlay/modal DOM changes
function observeDomForOverlays() {
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any significant DOM changes occurred
        for (let node of mutation.addedNodes) {
          if (node.nodeType === 1 && (node.classList?.contains('ProjectPage') || node.querySelector?.('[data-id="project-title"]'))) {
            shouldCheck = true;
            break;
          }
        }
      }
    });
    if (shouldCheck) {
      console.log('DOM mutation detected, checking buttons...');
      setTimeout(ensureButtonsInjected, 300);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize the extension
function init() {
  console.log('Initializing Behance2PDF extension on:', window.location.href);
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        ensureButtonsInjected();
        listenForSpaNavigation();
        observeDomForOverlays();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      ensureButtonsInjected();
      listenForSpaNavigation();
      observeDomForOverlays();
    }, 1000);
  }
}

// Run initialization
init(); 