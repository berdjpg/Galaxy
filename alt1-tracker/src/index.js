"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capture = capture;
// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
var a1lib = require("alt1");
// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
require("./index.html");
require("./appconfig.json");
require("./icon.png");
var output = document.getElementById("output");
// loads all images as raw pixel data async, images have to be saved as *.data.png
// this also takes care of metadata headers in the image that make browser load the image
// with slightly wrong colors
// this function is async, so you cant acccess the images instantly but generally takes <20ms
// use `await imgs.promise` if you want to use the images as soon as they are loaded
var imgs = a1lib.webpackImages({
    homeport: require("./homebutton.data.png")
});
// listen for pasted (ctrl-v) images, usually used in the browser version of an app
a1lib.PasteInput.listen(function (img) {
    findHomeport(img);
}, function (err, errid) {
    output.insertAdjacentHTML("beforeend", "<div><b>".concat(errid, "</b>  ").concat(err, "</div>"));
});
// You can reach exports on window.TestApp because of
// library:{type:"umd",name:"TestApp"} in webpack.config.ts
function capture() {
    if (!window.alt1) {
        output.insertAdjacentHTML("beforeend", "<div>You need to run this page in alt1 to capture the screen</div>");
        return;
    }
    if (!alt1.permissionPixel) {
        output.insertAdjacentHTML("beforeend", "<div>Page is not installed as app or capture permission is not enabled</div>");
        return;
    }
    var img = a1lib.captureHoldFullRs();
    findHomeport(img);
}
function findHomeport(img) {
    var loc = img.findSubimage(imgs.homeport);
    for (var _i = 0, loc_1 = loc; _i < loc_1.length; _i++) {
        var match = loc_1[_i];
        output.insertAdjacentHTML("beforeend", "<div>match at: ".concat(match.x, ", ").concat(match.y, "</div>"));
        //get the pixel data around the matched area and show them in the output
        var pixels = img.toData(match.x - 20, match.y - 20, imgs.homeport.width + 40, imgs.homeport.height + 40);
        output.insertAdjacentElement("beforeend", pixels.toImage());
        //overlay a rectangle around it on screen if we're running in alt1
        if (window.alt1) {
            alt1.overLayRect(a1lib.mixColor(255, 255, 255), match.x, match.y, imgs.homeport.width, imgs.homeport.height, 2000, 3);
        }
    }
    if (loc.length == 0 && window.alt1) {
        alt1.overLayTextEx("Couldn't find homeport button", a1lib.mixColor(255, 255, 255), 20, Math.round(alt1.rsWidth / 2), 200, 2000, "", true, true);
    }
}
//check if we are running inside alt1 by checking if the alt1 global exists
if (window.alt1) {
    //tell alt1 about the app
    //this makes alt1 show the add app button when running inside the embedded browser
    //also updates app settings if they are changed
    alt1.identifyAppUrl("./appconfig.json");
}
else {
    var addappurl = "alt1://addapp/".concat(new URL("./appconfig.json", document.location.href).href);
    output.insertAdjacentHTML("beforeend", "\n\t\tAlt1 not detected, click <a href='".concat(addappurl, "'>here</a> to add this app to Alt1\n\t"));
}
//also the worst possible example of how to use global exposed exports as described in webpack.config.js
output.insertAdjacentHTML("beforeend", "\n\t<div>paste an image of rs with homeport button (or not)</div>\n\t<div onclick='TestApp.capture()'>Click to capture if on alt1</div>");
