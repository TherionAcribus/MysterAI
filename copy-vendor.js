const fs = require('fs-extra');
const path = require('path');

// Ensure the vendor directory exists
fs.ensureDirSync(path.join(__dirname, 'src', 'vendor'));

// Copy jQuery
fs.copySync(
    path.join(__dirname, 'node_modules', 'jquery', 'dist', 'jquery.min.js'),
    path.join(__dirname, 'src', 'vendor', 'jquery', 'jquery.min.js')
);

// Copy Golden Layout
fs.copySync(
    path.join(__dirname, 'node_modules', 'golden-layout', 'dist', 'goldenlayout.min.js'),
    path.join(__dirname, 'src', 'vendor', 'golden-layout', 'goldenlayout.min.js')
);

fs.copySync(
    path.join(__dirname, 'node_modules', 'golden-layout', 'src', 'css', 'goldenlayout-base.css'),
    path.join(__dirname, 'src', 'vendor', 'golden-layout', 'goldenlayout-base.css')
);

fs.copySync(
    path.join(__dirname, 'node_modules', 'golden-layout', 'src', 'css', 'goldenlayout-dark-theme.css'),
    path.join(__dirname, 'src', 'vendor', 'golden-layout', 'goldenlayout-dark-theme.css')
);

// Copy Font Awesome
fs.copySync(
    path.join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free', 'css'),
    path.join(__dirname, 'src', 'vendor', 'fontawesome', 'css')
);

fs.copySync(
    path.join(__dirname, 'node_modules', '@fortawesome', 'fontawesome-free', 'webfonts'),
    path.join(__dirname, 'src', 'vendor', 'fontawesome', 'webfonts')
);
