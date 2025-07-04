// Create and inject the PDF button
function createPDFButton() {
  const button = document.createElement('button');
  button.className = 'behance2pdf-button';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
    Save as PDF
  `;
  document.body.appendChild(button);
  return button;
}

// Clean up the page content for PDF generation
function cleanPageForPDF() {
  // Hide elements we don't want in the PDF
  const elementsToHide = [
    '.Project-navBar',
    '.Project-sidebar',
    '.Project-footer',
    '.Project-comments',
    '.Project-toolbarContainer',
    '.js-project-lightbox-link',
    '.Project-module-image-link',
    '.Project-description-link'
  ];

  elementsToHide.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.display = 'none';
    });
  });

  // Get the main project content
  const projectContent = document.querySelector('.Project-content');
  if (!projectContent) return null;

  // Create a clone of the content for PDF generation
  const cleanContent = projectContent.cloneNode(true);

  // Remove any unwanted interactive elements
  cleanContent.querySelectorAll('button, .js-action-button').forEach(el => el.remove());

  // Remove any script tags
  cleanContent.querySelectorAll('script').forEach(el => el.remove());

  // Convert all images to their highest resolution version
  cleanContent.querySelectorAll('img').forEach(img => {
    // Behance stores high-res image URLs in data attributes
    const highResUrl = img.dataset.src || img.dataset.hiRes || img.src;
    if (highResUrl) {
      img.src = highResUrl;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
    }
  });

  return cleanContent;
}

// Generate PDF from content
async function generatePDF(content, projectTitle) {
  const element = content;
  const filename = `${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

  const options = {
    margin: [10, 10],
    filename: filename,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  try {
    return await html2pdf().set(options).from(element).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Main function to handle PDF generation
async function handlePDFGeneration(button) {
  try {
    // Add loading state
    button.classList.add('behance2pdf-loading');
    button.disabled = true;

    // Get project title
    const titleElement = document.querySelector('.Project-title');
    const projectTitle = titleElement ? titleElement.textContent.trim() : 'behance_project';

    // Clean the page content
    const cleanContent = cleanPageForPDF();
    if (!cleanContent) {
      throw new Error('Could not find project content');
    }

    // Generate and download the PDF
    await generatePDF(cleanContent, projectTitle);

    // Reset button state
    button.classList.remove('behance2pdf-loading');
    button.disabled = false;
  } catch (error) {
    console.error('Error:', error);
    alert('Error generating PDF. Please try again.');
    
    // Reset button state
    button.classList.remove('behance2pdf-loading');
    button.disabled = false;
  }
}

// Initialize the extension
function init() {
  // Only run on project pages
  if (!window.location.pathname.includes('/gallery/')) return;

  // Create and inject the button
  const button = createPDFButton();

  // Add click handler
  button.addEventListener('click', () => handlePDFGeneration(button));
}

// Run initialization
init(); 