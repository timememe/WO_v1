#!/bin/bash

# Build script for Render deployment
echo "Building React app..."
cd react-app
npm install
npm run build

echo "Copying old projects and files to dist..."
cd ..
cp -r projects react-app/dist/
cp -r shared react-app/dist/
cp -r port_assets react-app/dist/
cp hellothere.html react-app/dist/
cp port_script.js react-app/dist/
cp port_styles.css react-app/dist/
cp duelogue.html react-app/dist/
cp wewatching.html react-app/dist/

echo "Build complete! Static files are in react-app/dist/"
