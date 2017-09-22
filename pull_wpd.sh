#!/bin/bash

mkdir -p public/javascripts/WPD/css
mkdir -p public/javascripts/WPD/images

cp ../WebPlotDigitizer/combined.js public/javascripts/WPD/combined-compiled.js
cp ../WebPlotDigitizer/index.html public/javascripts/WPD/wpd.jst
cp ../WebPlotDigitizer/*.css public/javascripts/WPD/css
cp ../WebPlotDigitizer/images/* public/javascripts/WPD/images
