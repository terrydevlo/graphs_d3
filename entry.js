
let graphListFile = "graph_list.json";

// [START app]
let fs = require("fs");

const express = require('express');

const app = express();

app.use('/css', express.static('css'));
app.use('/ext', express.static('ext'));
app.use('/int', express.static('int'));
app.use('/dat', express.static('dat'));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

const ensure_valid_files = (files) => {
  let outFiles = [];
  files.forEach((f, i) => {
    if (f.includes(".") && (f[0] !== ".")){
      outFiles.push(f);
    }
  });
  return outFiles;
}

const strip_extension = (file) => {
  let periodLocation = file.lastIndexOf(".");
  let outStr = file.substring(0, periodLocation);
  return outStr;
}

app.get('/', (req, res) => {
  let datSubFolder = "dat/"
  let datDir = __dirname + "/dat/";

  let datSources = fs.readdirSync(datDir);

  console.log("datDir: ", datDir);

  console.log("datSources: ", datSources);

  let outDatasets = {};
  datSources.forEach((v, i) => {

    // console.log("v: ", v, "i: ", i);
    if (!v.includes(".")){

      let outDataSet = {};
      let thisDir = "./" + datSubFolder + v + "/";
      let edgesDir = thisDir + "edges/";
      let svgFileDatDir = datDir + v + "/svgs/regions.svg";
      let svgFile = thisDir + "svgs/regions.svg";

      let nodesFiles = fs.readdirSync( thisDir );
      let edgesFiles = fs.readdirSync( edgesDir );

      nodesFiles = ensure_valid_files( nodesFiles );
      edgesFiles = ensure_valid_files( edgesFiles );

      let nodeFilesMap = {};
      nodesFiles.forEach((nodeFile) => {
        let newNodeFile = {};
        let nodeName = strip_extension(nodeFile);
        nodeFilesMap[nodeName] = thisDir + nodeFile;
      });

      let edgesFileMap = {};
      edgesFiles.forEach((edgeFile) => {
        let newEdgeFile = {};
        let edgesName = strip_extension(edgeFile).replace("edges__", "").replace("edges_", "");
        edgesFileMap[edgesName] = edgesDir + edgeFile;
      });

      outDataSet["nodes"] = nodeFilesMap;
      outDataSet["edges"] = edgesFileMap;
      console.log(svgFileDatDir);
      if (fs.existsSync( svgFileDatDir )){
        outDataSet["svg"] = svgFile;
      }
      outDatasets[v] =  outDataSet;

    }
  });

  outDatasetsStr = JSON.stringify(outDatasets);

  let outFiles = JSON.stringify(fs.readdirSync(datDir));
  let edgesFiles = "_";
  try{
    edgesFiles = JSON.stringify(fs.readdirSync(edgesDir));
  } catch (er) {
    edgesFiles = "_";
  }




  res.render('index.html', {outDatasetsStr:outDatasetsStr});
});

// Start the server
const PORT = process.env.PORT || 8091;
app.listen(PORT, () => {

});
// [END app]
