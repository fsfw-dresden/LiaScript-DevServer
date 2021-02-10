require("dotenv").config();
import express from "express";
const app = express();
import doOpen from "open";

import fs from "fs";
import path from "path";
const cors = require("cors");
const handlebars = require("express-handlebars");

const argv = require("minimist")(process.argv.slice(2));

const liascriptPath = path.normalize(
  __dirname + "/../node_modules/@liascript/editor/dist"
);

const reloadPath = path.normalize(
  __dirname + "/../node_modules/reloadsh.js/reloader.browser.js"
);

function liascript() {
  console.log(" _     _       ____            _       _");
  console.log("| |   (_) __ _/ ___|  ___ _ __(_)_ __ | |_");
  console.log("| |   | |/ _` \\___ \\ / __| '__| | '_ \\| __|");
  console.log("| |___| | (_| |___) | (__| |  | | |_) | |_ ");
  console.log("|_____|_|\\__,_|____/ \\___|_|  |_| .__/ \\__|");
  console.log("                                |_|");
  console.log();
}

if (argv.h || argv.help) {
  liascript();

  console.log("-h  --help       show this help");
  console.log("-i  --input      input README.md file or folder (default: .)");
  console.log("-p  --port       used port number (default: 3000)");
  console.log("-l  --live       do live reload on file change");
  console.log("-o  --open       open in default browser");
  console.log("-t  --test       test online on https://LiaScript.github.io");
  console.log();
  console.log("-r  --responsiveVoice  add optional responsiveVoice support,");
  console.log("                       or pass your own responsiveVoice key.");
  console.log("                       Adding this feature might slow down");
  console.log("                       the reloading speed.");
  console.log("                       For more information visit:");
  console.log("                       https://responsivevoice.org");

  process.exit();
}

const port = argv.p || argv.port || 3000;
const openInBrowser = argv.o || argv.open;
const input = argv.i || argv.input || ".";
const liveReload = argv.l || argv.live || false;
const testOnline = argv.t || argv.test;

console.warn("live-reload:", liveReload);

let responsiveVoice: string | undefined;

if (argv.r || argv.responsiveVoice) {
  let active = argv.r || argv.responsiveVoice;

  if (typeof active === "string") {
    responsiveVoice = active;
  } else {
    responsiveVoice = process.env.RESPONSIVE_VOICE_KEY;
  }
}

var project = {
  path: null,
  readme: null,
};

if (input) {
  const stats = fs.lstatSync(input);

  // Is it a directory?
  if (stats.isDirectory()) {
    project.path = input;
  } else if (stats.isFile()) {
    project.path = path.dirname(input);
    project.readme = path.basename(input);
  }
}

app.set("view engine", "hbs");
app.engine(
  "hbs",
  handlebars({
    layoutsDir: path.normalize(__dirname + "/../views/layouts"),
    defaultLayout: "main",
    extname: "hbs",
  })
);
app.set("views", path.normalize(__dirname + "/../views"));

app.get("/", function (req, res) {
  res.redirect("/home");
});

app.get("/home*", function (req, res) {
  const currentPath = project.path + "/" + req.params[0];

  const stats = fs.lstatSync(currentPath);

  // Is it a directory?
  if (stats.isDirectory()) {
    const files = fs.readdirSync(currentPath).filter((e) => {
      return e[0] !== ".";
    });

    let basePath = "/home";
    let pathNames = req.params[0].split("/").filter((e) => {
      return e !== "";
    });

    let paths: { name: string; href: string }[] = [];
    for (let i = 0; i < pathNames.length; i++) {
      basePath += "/" + pathNames[i];
      paths.push({ name: pathNames[i], href: basePath });
    }

    res.render("main", {
      layout: "index",
      path: paths,
      file: files
        .map((file) => {
          return {
            name: file,
            href: `http://localhost:${port}/home${req.params[0]}/${file}`,
            isDirectory: fs.lstatSync(currentPath + "/" + file).isDirectory(),
          };
        })
        .sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) {
            return -1;
          } else if (!a.isDirectory && b.isDirectory) {
            return 1;
          } else {
            if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
              return -1;
            } else {
              return 1;
            }
          }
          return 0;
        }),
    });
  } else if (stats.isFile()) {
    if (req.params[0].endsWith(".md")) {
      if (testOnline) {
        res.redirect(
          `https://LiaScript.github.io/course/?http://localhost:${port}/${req.params[0]}`
        );
      } else {
        res.redirect(
          `/liascript/index.html?http://localhost:${port}/${req.params[0]}`
        );
      }
    } else {
      res.sendFile(req.params[0], { root: project.path });
    }
  } else {
    res.send("ups, something went wrong");
  }
});

app.get("/liascript/", function (req, res) {
  res.redirect("/liascript/index.html");
});

app.get("/liascript/index.html", function (req, res) {
  // ------------------------------------
  if (liveReload && responsiveVoice) {
    fs.readFile(liascriptPath + "/index.html", "utf8", function (err, data) {
      res.send(
        data.replace(
          "</head>",
          `<script type='text/javascript' src='/reloader/reloader.js'></script>
           <script type='text/javascript' src='https://code.responsivevoice.org/responsivevoice.js?key=${responsiveVoice}'></script>
           </head>`
        )
      );
    });
  }
  // ------------------------------------
  else if (liveReload) {
    fs.readFile(liascriptPath + "/index.html", "utf8", function (err, data) {
      res.send(
        data.replace(
          "</head>",
          `<script type='text/javascript' src='/reloader/reloader.js'></script></head>`
        )
      );
    });
  }
  // ------------------------------------
  else if (responsiveVoice) {
    fs.readFile(liascriptPath + "/index.html", "utf8", function (err, data) {
      res.send(
        data.replace(
          "</head>",
          `<script type='text/javascript' src='https://code.responsivevoice.org/responsivevoice.js?key=${responsiveVoice}'></script></head>`
        )
      );
    });
  }
  // ------------------------------------
  else {
    res.sendFile(liascriptPath + "/index.html");
  }
});

// load everything from the liascript folder
app.get("/liascript/*", function (req, res) {
  res.sendFile(req.params[0], { root: liascriptPath });
});
// ignore this one
app.get("/sw.js", function (req, res) {});
app.get("/favicon.ico", function (req, res) {});

// pass the reloader, to be used for live updates
app.get("/reloader/reloader.js", function (req, res) {
  res.sendFile(reloadPath);
});

// everything else comes from the current project folder
app.get("/*", cors(), function (req, res) {
  res.sendFile(req.originalUrl, { root: project.path });
});

let localURL = "http://localhost:" + port;

if (project.path && project.readme) {
  localURL +=
    "/liascript/index.html?http://localhost:" + port + "/" + project.readme;
}

if (testOnline && project.readme) {
  localURL =
    "https://LiaScript.github.io/course/?http://localhost:" +
    port +
    "/" +
    project.readme;
}

liascript();
const server = require("reloadsh.js")(app, liveReload ? [project.path] : []);

if (liveReload) {
  console.log(`Watching for changes in folder: "${project.path}"`);
}

server.listen(port);

if (openInBrowser) {
  doOpen(localURL);
}

console.log(`starting server on ${localURL}`);
console.log("hit Ctrl-c to close the server");