extract_centroid(inPathStr) {

let startingPointStrPos = inPathStr.indexOf("C");
let coordsPointStr = inPathStr.substring(startingPointStrPos).replace("Z","");
let startingPointStr = inPathStr.substring(1,startingPointStrPos);

let startingPointSplit = startingPointStr.split(",");
let xSum = [];
let ySum = [];
let nCoords = 0;

let startingX = 0;
let startingY = 0;

startingX = parseFloat(startingPointSplit[0]);
startingY = parseFloat(startingPointSplit[1]);

let coordsCstr = coordsPointStr.substring(startingPointStrPos);
console.log("coordsCstr: ", coordsCstr);
let cSplitStr = coordsCstr.split("C");


_.each(cSplitStr, (cSplit, i) => {

  // console.log("cSplitStr: ", cSplitStr);

  let coordsSplit = cSplit.split(",");
  let coord;

  _.each(coordsSplit, (coordStr, i) => {
      console.log("coordStr: ", coordStr);

      if (coordStr.length > 0){
        coord = parseFloat(coordStr);
        nCoords += 1;

        if (i % 2 === 0) {
          xSum.push(coord);
        } else {
          ySum.push(coord);
        }
      } else {

      }

    });
  });
// console.log(xSum);
// console.log(ySum);
let xCoord = (Math.max(...xSum) - Math.min(...xSum)) / 2 + startingX;
let yCoord = (Math.max(...ySum) - Math.min(...ySum)) / 2 + startingY;

// let xSumV = xSum.reduce((a, b) => { return a + b; });
// let ySumV = ySum.reduce((a, b) => { return a + b; });
//
// let xCoord = xSumV / xSum.length;
// let yCoord = ySumV / ySum.length;

let coords = {};
coords.x = xCoord;
coords.y = yCoord;
console.log("coords: ", coords);
return coords;
}