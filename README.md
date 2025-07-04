# Behance2PDF Chrome Extension

A Chrome extension that allows you to save Behance projects as high-quality PDFs while preserving the original layout, images, and typography.

## Features

- Adds a convenient "Save as PDF" button to Behance project pages
- Captures only the main project content, excluding distracting elements
- Generates high-quality PDFs with original layout and high-resolution images
- Automatically names PDFs based on the project title
- Works on any Behance project page

## Installation

1. Clone this repository or download the source code
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Development

The extension uses the following technologies:
- HTML2PDF.js for PDF generation
- Chrome Extension Manifest V3
- Modern JavaScript (ES6+)

### Building Icons

The extension icons are generated from an SVG source using ImageMagick. To generate the icons:

1. Install ImageMagick if you haven't already:
   ```bash
   # macOS
   brew install imagemagick

   # Ubuntu/Debian
   sudo apt-get install imagemagick
   ```

2. Run the icon generation script:
   ```bash
   ./generate_icons.sh
   ```

## Usage

1. Navigate to any Behance project page
2. Click the "Save as PDF" button in the top right corner
3. Wait for the PDF to generate (this may take a few seconds depending on the project size)
4. The PDF will automatically download with the project name as the filename

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
