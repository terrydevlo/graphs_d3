import DatUtils from "../../int/dat_lib/dat_utils.js";
import DataIO from "../../int/dat_lib/data_io.js";
// import JsonCsvUtils from './json_csv_utils.js';


import {
  build_arrow
} from "./shapes.js";

export default class GraphUI {

  constructor(allData, colorMap) {
    this.cmap = colorMap;
    this.allData = allData;
    this.relevantEdges = [];
    this.du = new DatUtils();
    this.io = new DataIO();
  }


  get_all_nodes(inJSON) {
    let result = JSONPath({
      path: "$..name",
      json: inJSON
    });
    return result;
  }


  get_available_nodes() {
    // console.log(this.nodes);
    let result = JSONPath({
      path: "$.[*]",
      json: this.nodes
    });
  }


  subset_links_to_curr_nodes(edgesData) {
    let outEdges = [];

    // console.log("this.allNodesListLower.length: ", this.allNodesListLower.length);

    _.each(edgesData, (edge) => {
      let srcLower = edge['source'].toLowerCase().trim();
      let targetLower = edge['target'].toLowerCase().trim();

      if (!this.allNodesListLower || this.allNodesListLower.includes(srcLower) &&
        this.allNodesListLower.includes(targetLower)) {
        outEdges.push(edge);
      }
    });
    return outEdges;
  }



  make_svg() {
    this.svg = d3.select("svg");

    // Clear any contents from svg
    this.svg.selectAll("*").remove();

    build_arrow(this.svg);

    // get dimensions and resize svg accordingly
    this.resize_svg();

    let selectedLayout;
    selectedLayout = this.selectedLayout;
    this.translateStr = "";

    if (this.selectedLayout === "radial") {
      this.translateX = this.diameter / 4;
      this.translateY = this.diameter / 4;
    } else if (this.selectedLayout === "horizontal") {
      this.translateX = 40;
      this.translateY = 0;
    } else if (["force_directed", "coord_layout"].includes(this.selectedLayout)) {
      this.translateX = this.width / 3;
      this.translateY = this.height / 3;
    }
    this.translateStr = "translate(" + this.translateX + "," + this.translateY + ")";

    this.g = this.svg.append("g").attr("transform", this.translateStr);

    this.svg.style("pointer-events", "all")
      .call(d3.zoom()
        .scaleExtent([1 / 16, 24])
        .on("zoom", () => zoomed(this.g)));

    let translateStr = this.translateStr;

    function zoomed(gArg) {
      gArg.attr("transform", d3.event.transform + translateStr);
    }

  }

  resize_svg() {

    this.diameter = svgContainer.clientWidth;

    this.svgContainer = d3.select("#svgContainer");
    this.width = svgContainer.clientWidth;
    this.height = svgContainer.clientHeight;

    this.svg = d3.select("svg");
    this.svg
      .attr("width", this.width)
      .attr("height", this.height);

  }

  redraw_svg() {

    this.resize_svg();
    this.draw_visuals();

  }


  get_connected_edges( nodeOI ) {

    let sourceEdges = _.filter(this.datEdges, ['source', nodeOI ]);
    let targetEdges = _.filter(this.datEdges, ['target', nodeOI ]);

    let validSourceEdges = _.filter(sourceEdges, ['edge_type', "1"]);
    let validTargetEdges = _.filter(targetEdges, ['edge_type', "1"]);

    return [validSourceEdges, validTargetEdges];

  }


  async build_graph(datState, colorMap) {
    this.cmap = colorMap;

    console.log(datState);
    this.pDuration = 0;
    this.selectedGraph = datState.nodes;

    this.selectedLayout = datState.layout;
    this.showLabels = datState.showLabels;

    // this.graphType = graphType;

    this.currCol = this.cmap.get( datState.nodes );
    // https://bl.ocks.org/d3noob/43a860bc0024792f8803bba8ca0d5ecd

    // this.datFile = this.filenameMap.get( datState.nodes );
    this.datFiles = this.allData[ datState.dat ];
    this.nodeFile = _.get( this.datFiles, ["nodes", datState.nodes] );
    this.svgFile = false;

    if (_.keys(this.datFiles).includes("svg")){
      this.svgFile = this.datFiles["svg"];
    }

    this.datState = datState;

    this.svgContainer = d3.select("#svgContainer");

    let i = 0;

    this.nodesDat = await Promise.resolve( this.io.load_file( this.nodeFile ) );

    this.get_relevant_edges();
    if (_.isArray(this.nodesDat) && this.nodesDat.length === 1) {
      this.nodesDat = this.nodesDat[0];
    }

    this.allNodesList = this.get_all_nodes(this.nodesDat);
    this.allNodesListLower = [];
    this.allNodesList.forEach((item) => {
      let outItem = item.toLowerCase();
      this.allNodesListLower.push(outItem);
    });

    // check and possibly correct layout setting
    this.nLevels = this.du.count_levels(this.nodesDat);

    let hierLayouts = ["radial", "horizontal"];
    let flatLayouts = ["coord_layout", "force_directed"];

    if (this.nLevels > 1) {
      if (!hierLayouts.includes(this.selectedLayout)){
        this.selectedLayout="radial";
      }
      this.layoutOpts = hierLayouts;

      this.root = d3.hierarchy(this.nodesDat);

    } else {
      if (!flatLayouts.includes(this.selectedLayout)){
        this.selectedLayout="coord_layout";
      }
      this.layoutOpts = flatLayouts;

      let promiseDone = await Promise.resolve(this.load_edges_file(this.nodes));
    }

    // Update layout ctrlGui
    window.dispatch.call("layoutFromGraph", this.layoutOpts, this.selectedLayout);

    if (this.selectedLayout === "radial" || this.selectedLayout === "tree_map") {
      this.root.x0 = 0;
      this.root.y0 = 0;
    } else if (this.selectedLayout === "horizontal") {
      this.root.x0 = this.height / 2;
      this.root.y0 = 0;
    } else if (["force_directed", "coord_layout"].includes(this.selectedLayout)) {
      this.root = this.nodesDat;
    };


    this.make_svg();

    if (this.svgFile) {
      await Promise.resolve(this.draw_blobs());
    }

    this.redraw_svg();

  }



  async load_edges_file(edgesToLoad) {

    let i = 0;
    let fileToLoad;

    let edgesFiles = _.get(this.allData, [this.datState.dat, "edges"]);

    _.forOwn(edgesFiles, (v, k) => {
      if (i === 0) {
        fileToLoad = v;
      }
      if (v.includes(edgesToLoad)) {
        fileToLoad = v;
      }
      i++;
    });

    await d3.json(fileToLoad).then(async (data) => {
      this.datEdges = data;
    });

    console.log("this.datEdges: ", this.datEdges);

  }



  draw_visuals(source) {
    if (!source) {
      source = this.root;
    }
    let cluster = d3.cluster()
      .size([this.height, this.width]);

    let radialTree = d3.tree()
      .size([360, (this.diameter * 3)])

    let treeMap = d3.treemap()
      .size([this.width, this.height]);

    // Compute the new tree layout.
    let treeData;

    if (this.selectedLayout === "radial") {
      treeData = radialTree(this.root);
    } else if (this.selectedLayout === "horizontal") {
      treeData = cluster(this.root)
    }

    if (this.selectedLayout === "force_directed") {
      this.update_force_directed(source);
    } else if (this.selectedLayout === "coord_layout") {
      this.update_coord_layout(source);
    } else {
      this.nodes = treeData.descendants();
      this.update_hier_nodes(source);

      this.links = treeData.links();
      this.build_links(this.links, this.selectedGraph);

    }
  }




  update_hier_nodes(source) {

    // update nodes
    let node = this.g.selectAll(".node")
      .data(this.nodes, (d) => {
        return d.id;
      })

    let showLabels = this.showLabels;

    // Enter any new nodes at the parent's previous position.
    let nodeEnter = node.enter().append("g")
      .attr("class", (d) => {
        return "node";
      })
      .attr("transform", (d) => {
        if (this.selectedLayout === "radial") {
          return "translate(" + radialPoint(source.x0, source.y0) + ")";;
        } else {
          return "translate(" + source.y0 + "," + source.x0 + ")";
        }
      })
      .on("click", (d) => {
        this.click_node(d);
      })
      .on("mouseover", function(d) {
        if (!showLabels) {
          d3.select(this).select("text").text((d) => {
            return d.data.name;
          })
        }
      })

      .on("mouseout", function(d) {
        if (!showLabels) {
          d3.select(this).select("text").text("");
        }
      })

    nodeEnter.append("circle")
      .attr('class', 'node')
      .attr('r', 4)
      .style("stroke", this.currCol)
      .style("fill", (d) => {
        return d._children ? this.currCol : "#fff";
      })


    nodeEnter.append("text")
      .attr("dy", ".35em")
      .attr("x", (d) => {
        if (this.selectedLayout === "radial") {
          return d.x < 180 === !d.children ? 13 : -13;
        }
        if (this.selectedLayout || this.selectedLayout === "horizontal") {
          return d.children ? -13 : 13;
        }
      })
      .attr("text-anchor", (d) => {
        if (this.selectedLayout === "radial") {
          // return d.x < Math.PI === !d.children ? "start" : "end";
        }
      })

      .attr("transform", function(d) {
        if (this.selectedLayout === "radial") {
          return "rotate(" + (d.x < Math.PI ? d.x - Math.PI / 2 : d.x + Math.PI / 2) * 180 / Math.PI + ")";
        }
      })

      .text((d) => {
        if (this.showLabels) {
          if (d.data.name.length > 40) {
            return d.data.name.substring(0, 40) + "...";
          } else {
            return d.data.name;
          }
        }
      })
      .on("mouseover", function(d) {
        d3.select(this).text((d) => {
          return d.data.name;
        })
      })
      .on("mouseout", function() {
        // Remove the info text on mouse out.
        d3.select(this).text((d) => {
          if (d.data.name.length > 40) {
            return d.data.name.substring(0, 40) + "...";
          } else {
            return d.data.name;
          }
        })
      });


    // Transition nodes to their new position.
    let nodeUpdate = nodeEnter.merge(node);
    nodeUpdate.transition()
      .duration(this.pDuration)
      .attr("transform", (d) => {
        if (this.selectedLayout === "horizontal") {
          return "translate(" + d.y + "," + d.x + ")";
        } else if (this.selectedLayout === "radial") {
          return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
        }
      })

    nodeUpdate.select("circle.node")
      .attr('r', 10)
      .style("fill", (d) => {
        return d.children || d._children ? this.currCol : "#fff";
      })
      .attr('cursor', (d) => {
        return d.children || d._children ? "pointer" : "cursor";
      });


    if (this.selectedLayout === "radial") {
      nodeUpdate.select("text")
        .style("text-anchor", function(d) {
          return d.x < 180 === !d.children ? "start" : "end";
        })

        .attr("transform", function(d) {
          return d.x < 180 ? "translate(0)" : "rotate(180)translate(-" + (0) + ")";
        });
    } else if (this.selectedLayout === "horizontal") {
      nodeUpdate.select("text")

        .style("text-anchor", function(d) {
          return !d.children ? "start" : "end";
        })
    }

    let nodeExit = node.exit().transition()
      .duration(this.pDuration)
      .remove();

    nodeExit.select("text")
      .style("fill-opacity", 1e-6);

    // Stash the old positions for transition.
    this.nodes.forEach((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    function project(x, y) {
      var angle = (x - 90) / 180 * Math.PI,
        radius = y;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    }

    function radialPoint(x, y) {
      return [(y = +y) * Math.cos(x -= Math.PI / 2), y * Math.sin(x)];
    }
  }

  // Toggle children on click.
  click_node(d) {
    // console.log(d);
    if (d.children || d._children) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
      this.draw_visuals(d);
      this.refresh_added_links();

    }
  }


  ref_links_to_nodes(inputLinks) {
    console.log("this.nodes: ", this.nodes);
    let outputLinks = [];
    let nodeKeys = _.keys(this.nodes[0].data);
    let searchVal = "data.nameLower";
    if (!nodeKeys.includes("nameLower")){
      searchVal = "data.name";
    }

    _.each(inputLinks, (inputLink) => {

      let matchingNode = _.find(this.nodes, [searchVal, inputLink['source']]);
      let outputLink = {}
      if (matchingNode) {
        outputLink['source'] = matchingNode;
        matchingNode = _.find(this.nodes, [searchVal, inputLink['target']]);
        if (matchingNode) {
          outputLink['target'] = matchingNode;
          outputLinks.push(outputLink);
        }
      }
    });
    return outputLinks;
  }


  get_relevant_edges() {

    this.relevantEdges = [];
    this.relevantEdgesDat = d3.map();
    this.rawEdgesData = d3.map();
    this.edgesSelected = d3.map();

    let nRead = 0;
    let nRelevantEdgesType = 0;

    // console.log("this.nodes: ", this);
    // console.log("this.edgesFileMap: ", this.edgesFileMap);
    // this.edgesFileMap =

    // Flatten edges
    window.dispatch.call("buildEdges");

    _.forOwn(this.datFiles.edges, (filename, edgesType) => {
      // don't include own edges
      if (!edgesType.includes(this.selectedGraph)) {
        nRelevantEdgesType++;
        d3.json(filename).then((edgesData) => {
          nRead++;
          // console.log(edgesData);
          // let edgesType = keyName.substring(1).toString();
          this.rawEdgesData.set(edgesType, edgesData);
          this.edgesSelected.set(edgesType, false);

          this.refine_relevant_edges(edgesType, edgesData)
          if (nRead === nRelevantEdgesType) {
            window.dispatch.call("buildEdges");
          }
        });
      }
    });
  }

  refine_relevant_edges(edgesType, edgesData) {
    // console.log(edgesType, " incoming edges: ", edgesData.length);
    if (this.relevantEdgesDat.get(edgesType)) {
      // console.log("PR this.relevantEdgesDat.get(edgesType): ", this.relevantEdgesDat.get(edgesType).length);
    }
    let subsetLinks = this.subset_links_to_curr_nodes(edgesData);
    // console.log(edgesType, " relevant edges: ", subsetLinks.length);

    if (subsetLinks.length > 0) {

      if (!this.relevantEdges.includes(edgesType)) {
        this.relevantEdges.push(edgesType);
      }

      this.relevantEdgesDat.set(edgesType, subsetLinks);
      if (this.relevantEdgesDat.get(edgesType)) {
        // console.log("POST this.relevantEdgesDat.get(edgesType): ", this.relevantEdgesDat.get(edgesType).length);
      }
    } else {

      this.relevantEdges = _.remove(this.relevantEdges, (item) => {
        if (item !== edgesType) {
          return item;
        }
      });
    }
  }


  refresh_added_links() {

    _.forOwn(this.edgesSelected, (selected, keyName) => {
      // don't include own edges
      if (selected) {
        let edgesType = keyName.substring(1).toString();
        console.log(edgesType);
        this.add_links(edgesType);
      }
    });

  }


  update_links( edgesType, addLinks ) {
    this.edgesSelected.set(edgesType, addLinks);

    if (addLinks) {
      this.add_links(edgesType)
    } else {
      this.destroy_links(edgesType);
    }

  }


  add_links(edgesType) {
    let subsetLinks = this.relevantEdgesDat.get(edgesType);
    console.log("edgesType: ", edgesType);
    console.log("subsetLinks: ", subsetLinks);

    let linksWithNodesRef = this.ref_links_to_nodes(subsetLinks);
    console.log("linksWithNodesRef: ", linksWithNodesRef);
    this.build_links(linksWithNodesRef, edgesType);
  }



  build_links( links, linkType ) {
    let classSelText = ".link." + linkType;
    let classAddText = "link " + linkType;
    let link = this.g.selectAll(classSelText)
      .data(links, (d) => {
        return d.name;
      });

    console.log("this.cmap: ", this.cmap);
    console.log("linkType: ", linkType);

    // Enter any new links at the parent's previous position.
    let linkEnter = link.enter().insert("path", "g")
      .attr("class", classAddText)
      .style("stroke", () => {
        return this.cmap.get(linkType)
      })


    let linkUpdate = linkEnter.merge(link);

    // // Transition links to their new position.
    linkUpdate.transition()
      .duration(this.pDuration)


    if (this.selectedLayout === "radial") {
      linkUpdate.attr("d", function(d) {
        return "M" + project(d.source.x, d.source.y) +
          "C" + project(d.source.x, (d.source.y + d.target.y) / 2) +
          " " + project(d.target.x, (d.source.y + d.target.y) / 2) +
          " " + project(d.target.x, d.target.y);
      })

    } else if (this.selectedLayout === "horizontal") {
      linkUpdate.attr("d", d3.linkHorizontal()
        .x((d) => {
          return d.y;
        })
        .y((d) => {
          return d.x;
        })
      )
    }

    //
    // Transition exiting nodes to the parent's new position.
    let linkExit = link.exit().transition()
      .duration(this.pDuration)
      .remove();
    //
    // if (this.selectedLayout === "radial") {
    //   linkExit.attr("d", d3.linkRadial()
    //       .angle((d) => {
    //         return source.x;
    //       })
    //       .radius((d) => {
    //         return source.y;
    //       }))
    //     .remove()
    //
    // } else if (this.selectedLayout === "horizontal") {
    //   linkExit.attr("d", d3.linkHorizontal()
    //       .x((d) => {
    //         return source.y;
    //       })
    //       .y((d) => {
    //         return source.x;
    //       })
    //     )
    //     .remove()
    // }

    function project(x, y) {
      var angle = (x - 90) / 180 * Math.PI,
        radius = y;
      return [radius * Math.cos(angle), radius * Math.sin(angle)];
    }
  }

  destroy_links(linksToDestroy) {
    let classSelText = ".link." + linksToDestroy;
    let links = this.g.selectAll(classSelText)
      .remove()

  }





  // flat layout graph


  get_mid_point( xPoint1, xPoint2 ){

    let minPoint = Math.min(xPoint1);
    let midPoint =  ( xPoint1 + xPoint2 ) / 2;

    return midPoint;
  }


  match_noncoord_nodes_to_coords( theNodes, inputNode ){
    let edges = [];

    let targetNodeLink = _.find( this.datEdges, [ 'source', inputNode.id ] );
    let sourceNodeLink = _.find( this.datEdges, [ 'target', inputNode.id ] );

    let sourceNode = _.find(theNodes, ['id', targetNodeLink.target]);
    let targetNode = _.find(theNodes, ['id', sourceNodeLink.source]);

    let xMidPoint = this.get_mid_point(sourceNode.x, targetNode.x);
    let yMidPoint = this.get_mid_point(sourceNode.y, targetNode.y);

    inputNode.x = xMidPoint;
    inputNode.y = yMidPoint;

    return inputNode;
  }



  async draw_blobs(){

    let blobG = this.g.append('g')
      .attr("id", "blobAsJson");

    let loadedBlob = await Promise.resolve(this.io.load_file(this.svgFile));
    console.log(this.svgFile);

    // let loadedBlob = this.io.load_file(svgMap);
    // let blobMap = this.du.extract_xml( loadedBlob, "g" );
    let blobAsJson = this.du.xml_to_json(loadedBlob);

    let pathObjs = JSONPath({
      path: "$..g.path[*]",
      json: blobAsJson
    });

    let cleanedPathObjs = [];
    _.forOwn(pathObjs, (pathObj, k) => {
      let obj = _.values(pathObj)[0];
      // console.log("obj.d: ", obj.d);
      obj.centroid = this.extract_centroid(obj.d);
      cleanedPathObjs.push(obj);
    });

    let datNodes = [];
    let labelledParents = [];
    _.each(this.nodesDat, (node) => {

      if (_.keys(node).includes("localising_parent")) {
        let localisedParent = _.find(cleanedPathObjs, ["id", node["localising_parent"]]);
        node.x = localisedParent.centroid.x;
        node.y = localisedParent.centroid.y;
        localisedParent.node = node.id;
        labelledParents.push( localisedParent );
      }

      datNodes.push(node);
    });

    let origTranslateX = this.translateX;
    let origTranslateY = this.translateY;

    let active = d3.select(null);
    let width = this.width;
    let height = this.height;
    let svg = this.svg;
    let g = this.g;

    blobG
      .selectAll("path")
      .data(labelledParents)
      .enter().append("g")
      .append("path")
      .attr("id", (d) => {
        return d.id
      })
      .attr("d", (d) => {
        return d.d
      })
      .attr("style", (d) => {
        return d.style
      })

      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", zoomInClick)
      .on("mouseover", function(d) {
        let thisEl = d3.select(this);
        thisEl.style("stroke-width", 1.5)
          .style('stroke', "#999");
      })
      .on("mouseout", function(d) {
        let thisEl = d3.select(this);
        thisEl.style("stroke-width",0);
      })



    const call_get_connected = (nodeID) => {
      return this.get_connected_edges(nodeID);
    }

    const get_translate_coords = () => {
      return [this.translateX, this.translateY]
    }

    const update_translate_coords = (coordsX, coordsY) => {
      this.translateX = coordsX;
      this.translateY = coordsY;
    }

    function dragged(d) {

      let dx = d3.event.sourceEvent.offsetX - origTranslateX,
        dy = d3.event.sourceEvent.offsetY - origTranslateY;

      let selectedBlob = d3.select(this);


      let blobDx = dx - d.centroid.x;
      let blobDy = dy - d.centroid.y;

      // update_translate_coords(blobDx, blobDy);

      selectedBlob
        .attr("transform", (d) => {

          return "translate(" + blobDx + "," + blobDy + ")";
        });


      let housedNodeId = "#" + d.node;
      let housedNode = d3.select(housedNodeId)
        .attr("transform", shape => "translate(" + blobDx + "," + blobDy + ")");

      housedNode.data.x = blobDx;

      housedNodeId = "#lbl" + d.node;
      let housedNodelbl = d3.select(housedNodeId)
        .attr("transform", shape => "translate(" + blobDx + "," + blobDy + ")");

      let outEdges = call_get_connected(d.node);

      _.each(outEdges[0], (edge) => {
        let relevantLinkID = "#" + edge.id;
        let sourceLink = d3.select(relevantLinkID);

        sourceLink
          .attr("x1", dx)
          .attr("y1", dy)
          // .attr("transform", shape =>  "translate(" + dx + "," + dy + ")");

      });

      _.each(outEdges[1], (edge) => {
        let relevantLinkID = "#" + edge.id;
        let targetLink = d3.select(relevantLinkID);

        targetLink
          .attr("x2", dx)
          .attr("y2", dy)
      });

    }

    function dragstarted(d) {
      d3.select(this).raise().classed("active", true);
    }

    function dragended(d) {
      d3.select(this).classed("active", false);
    }

    let zoom = d3.zoom()
      .scaleExtent([0.1, 2])
      .on("zoom", zoomed);

    function zoomInClick(d) {
      if (active.node() === this) return reset();
      active.classed("active", false);
      active = d3.select(this).classed("active", true);

      let [currTranslateX, currTranslateY] = get_translate_coords();

      let thisTransform = d3.select(this).attr("transform");

      let geomStuff = d3.select(this).node().getBBox();
      let thisX = geomStuff.x;
      let thisY = geomStuff.y;
      let xTransform = 0;
      let yTransform = 0;

      if (thisTransform){
        let getTransform = thisTransform.split("(")[1].split(",");
        xTransform = parseFloat(getTransform[0]);
        yTransform = parseFloat(getTransform[1].split(")")[0]);

        thisX += xTransform;
        thisY += yTransform;
      }

      let scale = Math.max(22, Math.min(8, 0.9 / Math.max(thisX / width, thisX / height)));
      if (!scale) {
        scale = 22;
      }
      scale = 12;

       let translateX = width / 10 - scale * (thisX) + currTranslateX;;
       let translateY = height / 50 - scale * (thisY) + currTranslateY;


      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale)); // updated for d3 v4

    }

    function reset() {
      active.classed("active", false);
      active = d3.select(null);

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(origTranslateX, origTranslateY)); // updated for d3 v4
    }

    function zoomed() {
      g.attr("transform", d3.event.transform); // updated for d3 v4
    }
  }


  extract_centroid(inPathStr) {

    let pathsSplit = inPathStr.split(" ");
    let xSum = [];
    let ySum = [];
    let nCoords = 0;

    let startingX = 0;
    let startingY = 0;

    _.each(pathsSplit, (pathStr, i) => {
      if (i > 1) {
        if (pathStr.indexOf(',') > 0) {
          nCoords += 1;

          let coordSplit = pathStr.split(",");
          let x = parseFloat(coordSplit[0]);
          let y = parseFloat(coordSplit[1]);
          xSum.push(x);
          ySum.push(y);
        }
      } else if (i === 1) {
        let coordSplit = pathStr.split(",");
        startingX = parseFloat(coordSplit[0]);
        startingY = parseFloat(coordSplit[1]);
      }
    });

    let xCoord = (Math.max(...xSum) - Math.min(...xSum)) / 2 + startingX;
    let yCoord = (Math.max(...ySum) - Math.min(...ySum)) / 2 + startingY;

    let coords = {};
    coords.x = xCoord;
    coords.y = yCoord;
    return coords;

  }

  update_coord_layout( nodes ) {

    let validEdges = _.filter(this.datEdges, ['edge_type', "1"]);

    let coordNodes = [];
    _.each(nodes, (node) => {

      if (!_.keys(node).includes("localising_parent")){
        let sourceEdge = _.find( validEdges, ['source', node.id]);
        let targetEdge = _.find( validEdges, ['target', node.id]);

        if (sourceEdge) { node.source = sourceEdge.id };
        if (targetEdge) { node.target = targetEdge.id };

        node = this.match_noncoord_nodes_to_coords( nodes, node );
      }
      coordNodes.push(node);

    });

    nodes = coordNodes;

    let lineWidth = 80;
    let nodeHeight = 30;
    let nodeWidth = 50;
    let edgeWidth = 100;

    let outEdges = [];

    _.each(this.datEdges, (edge) => {

      let sourceNode = _.find(nodes, ['id', edge.source]);
      let targetNode = _.find(nodes, ['id', edge.target]);

      edge.sourceX = sourceNode.x - nodeWidth/2;
      edge.sourceY = sourceNode.y;

      edge.targetX = targetNode.x - nodeWidth/2;
      edge.targetY = targetNode.y;

      if (edge.edge_type === "1") {
        outEdges.push(edge);
      }

    });

    let links = this.g.append("g")
      .attr("stroke", "#009900")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(outEdges)
      .enter().append("line")
      .attr("id", d => (d.id))
      .attr("source", d => d.source)
      .attr("target", d => d.target)
      .attr("x1", (d) => {
        return d.sourceX;
      })
      .attr("y1", (d) => {
        return d.sourceY;
      })
      .attr("x2", (d) => {
        return d.targetX;
      })
      .attr("y2", (d) => {
        return d.targetY;
      })
      .attr("marker-end", "url(#end)")


    let active = d3.select(null);

    // Define the div for the tooltip
    let tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);


    // 0 Nodes
    let nodeType = "potential";
    let zeroNodes = this.g.selectAll(nodeType)
      .data(nodes.filter((d) => {
        return d.type === nodeType
      }))
      .enter().append("rect");

    zeroNodes
      .attr("id", d => d.id)
      .attr("class", nodeType)
      .attr("height", (d) => {
        return nodeHeight;
      })
      .attr("width", (d) => {
        return nodeWidth;
      })
      .attr("rx", (d) => {
        if (d.type === "potential") return 8;
      })
      .attr("ry", (d) => {
        if (d.type === "potential") return 8;
      })
      .attr("stroke", "#FF0000")
      .attr("stroke-width", 1.5)
      .style("fill", "#FFF")

      .attr("x", (d) => {
        return d.x  - nodeWidth;
      })
      .attr("y", (d) => {
        return d.y - (nodeHeight / 2);
      })
      .on("mouseover", function(d) {
        d3.select(this).attr("stroke-width", 2.5);
        this.parentNode.append("");

        let outText = "";
        _.forOwn(d, (v, k) => {
          if (true || !["x", "y", "vy", "vx", "index"].includes(k)) {
            outText += k + " : " + v + "<br/>";
          }
        });
        tooltip.transition()
          .duration(0)
          .style("opacity", 1);
        tooltip.html(outText)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY + 10) + "px")
      })
      .on("mouseout", function(d) {
        d3.select(this).attr("stroke-width", 1.5);

        tooltip.transition()
          .duration(0)
          .style("opacity", 0);
      })
      .on("click", zoomInClick);


    // 1 nodes
    nodeType = "flow";
    let oneNodes = this.g.selectAll(nodeType)
      .data(nodes.filter((d) => {
        return d.type === nodeType
      }))

    oneNodes
      .enter().append("circle")
      .attr("id", d => d.id)
      .attr("class", nodeType)
      .attr("stroke", "#009900")
      .attr("stroke-width", 1.5)
      .style("fill", "#FFF")
      .attr("cx", (d) => {
        // console.log("d.x: ", d.x);
        return d.x - nodeWidth / 2;
      })
      .attr("cy", (d) => {
        // console.log("d.y: ", d.y);
        return d.y;
      })
      .attr("r", nodeHeight / 2)
      .on("mouseover", function(d) {
        d3.select(this).attr("stroke-width", 2.5);
        this.parentNode.append("");
        let outText = "";
        _.forOwn(d, (v, k) => {
          if (true || !["x", "y", "vy", "vx", "index"].includes(k)) {
            outText += k + " : " + v + "<br/>";
          }
        });
        tooltip.transition()
          .duration(0)
          .style("opacity", 1);
        tooltip.html(outText)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY + 10) + "px")
      })
      .on("mouseout", function(d) {
        d3.select(this).attr("stroke-width", 1.5);

        tooltip.transition()
          .duration(0)
          .style("opacity", 0);
      })
      .on("click", zoomInClick);

    let allNodes = zeroNodes.merge(oneNodes);

    let labelsLyphNodes = this.g.append("g")
    labelsLyphNodes
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .attr("id", d => "lbl" + d.id)
      .attr("x", (d) => {
        return d.x - 7 - nodeWidth / 2;
      })
      .attr("y", (d) => {
        return d.y + 3;
      })
      .style("fill", "#000")
      .style("stroke", "#000")
      .style("dy", "0.25em")
      .text((d) => {
        return d.id;
      })

    let width = this.width;
    let height = this.height;
    let svg = this.svg;
    let g = this.g;

    let get_translate_coords = () => {return [this.translateX, this.translateY]};
    let origTranslateX = this.translateX;
    let origTranslateY = this.translateY;

    let zoom = d3.zoom()
      .scaleExtent([0.1, 2])
      .on("zoom", zoomed);

    function zoomInClick(d) {

      if (active.node() === this) return reset();
      active.classed("active", false);
      active = d3.select(this).classed("active", true);

      let thisX = d.x;
      let thisY = d.y;

      let [currTranslateX, currTranslateY] = get_translate_coords();

      let thisTransform = d3.select(this).attr("transform");

      let xTransform = 0;
      let yTransform = 0;

      if (thisTransform){
        let getTransform = thisTransform.split("(")[1].split(",");
        xTransform = parseFloat(getTransform[0]);
        yTransform = parseFloat(getTransform[1].split(")")[0]);

        thisX += xTransform;
        thisY += yTransform;
      }

      // console.log("width: ", width, " height: ", height);
      let scale = Math.max(22, Math.min(8, 0.9 / Math.max(thisX / width, thisX / height)));
      if (!scale) {
        scale = 22;
      }
      scale = 22;

     let translateX = width / 3 - scale * (thisX) + currTranslateX;;
     let translateY = height / 60 - scale * (thisY) + currTranslateY;

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale)); // updated for d3 v4
    }

    function reset() {
      active.classed("active", false);
      active = d3.select(null);
      let [currTranslateX, currTranslateY] = get_translate_coords();

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(currTranslateX, currTranslateY)); // updated for d3 v4
    }

    function zoomed() {
      // g.style("stroke-width", 1.5 / d3.event.scale + "px");
      g.attr("transform", d3.event.transform); // updated for d3 v4
    }
  }



  update_force_directed(nodes) {
    console.log("nodes: ", nodes);

    let forceNodes = [];
    let fixedNodes = [];

    _.each(nodes, (node) => {
      if (_.keys(node).includes("localising_parent")) {
        fixedNodes.push(node);
      } else {
        forceNodes.push(node);
      }
    });

    let forceLayout = d3.forceSimulation(forceNodes);

    // convert edges to reference index instead of id.
    let newEdges = [];
    _.each((this.datEdges), edge => {

      let sourceNode = _.find(nodes, ['id', edge['source']]);
      let targetNode = _.find(nodes, ['id', edge['target']]);
      if (edge.edge_type === "1" && sourceNode.index && targetNode.index) {
        edge['source'] = sourceNode.index;
        edge['target'] = targetNode.index;
        newEdges.push(edge);
      } else if (edge.edge_type === "1") {
        edge['source'] = sourceNode.id;
        edge['target'] = targetNode.id;
        newEdges.push(edge);
      }
    });

    let lineWidth = 80;

    let nodeHeight = 30;
    let nodeWidth = 60;
    let edgeWidth = 100;
    let active = d3.select(null);
    let mergedNodes = _.concat(forceNodes, fixedNodes);

    forceLayout
      .force("charge", d3.forceManyBody().strength(-100000))
      // .force("link", d3.forceLink( newEdges ).distance(edgeWidth).strength(1).iterations(100))
      .force("x", d3.forceX())
      .force("y", d3.forceY())
      .stop();

    d3.timeout(() => {
      // // See https://github.com/d3/d3-force/blob/master/README.md#simulation_tick
      for (let i = 0, n = Math.ceil(Math.log(forceLayout.alphaMin()) / Math.log(1 - forceLayout.alphaDecay())); i < n; ++i) {
        forceLayout.tick();
      }

      let links = this.g.append("g")
        .attr("stroke", "#009900")
        .attr("stroke-width", 1.5)
        .selectAll("line")
        .data(this.datEdges)
        .enter().append("line")
        .attr("id", d => d.id)
        .attr("x1", (d) => {
          return d.source.x;
        })
        .attr("y1", (d) => {
          return d.source.y;
        })
        .attr("x2", (d) => {
          return d.target.x;
        })
        .attr("y2", (d) => {
          return d.target.y;
        })
        .attr("marker-end", "url(#end)")


      // Define the div for the tooltip
      let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);


      // 0 Nodes
      let nodeType = "potential";
      let zeroNodes = this.g.selectAll(nodeType)
        .data(mergedNodes.filter((d) => {
          return d.type === nodeType
        }))
        .enter().append("rect");
      // .enter().append((d) => {console.log(nodeType); nodeType});

      zeroNodes
        .attr("class", nodeType)
        .attr("height", (d) => {
          return nodeHeight;
        })
        .attr("width", (d) => {
          return nodeWidth;
        })
        .attr("rx", (d) => {
          if (d.type === "potential") return 8;
        })
        .attr("ry", (d) => {
          if (d.type === "potential") return 8;
        })
        .attr("stroke", "#FF0000")
        .attr("stroke-width", 1.5)
        .style("fill", "#FFF")
        // .attr("x", (d) => { console.log("d.x: ", d.x); return d.x; })
        // .attr("y", (d) => { console.log("d.y: ", d.y); return d.y; })
        .attr("x", (d) => {
          return d.x - (nodeWidth);
        })
        .attr("y", (d) => {
          return d.y - (nodeHeight / 2);
        })
        .on("mouseover", function(d) {
          this.parentNode.append("");
          let outText = "";
          _.forOwn(d, (v, k) => {
            if (true || !["x", "y", "vy", "vx", "index"].includes(k)) {
              outText += k + " : " + v + "<br/>";
            }
          });
          tooltip.transition()
            .duration(0)
            .style("opacity", 1);
          tooltip.html(outText)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY + 10) + "px")
        })
        .on("mouseout", function(d) {
          tooltip.transition()
            .duration(0)
            .style("opacity", 0);
        })
        .on("click", zoomInClick);

      nodeType = "flow";
      let oneNodes = this.g.selectAll(nodeType)
        .data(mergedNodes.filter((d) => {
          return d.type === nodeType
        }))

      oneNodes
        .enter().append("circle")
        .attr("class", nodeType)
        .attr("stroke", "#009900")
        .attr("stroke-width", 1.5)
        .style("fill", "#FFF")
        .attr("cx", (d) => {
          return d.x - nodeWidth / 2;
        })
        .attr("cy", (d) => {
          return d.y;
        })
        .attr("r", nodeHeight / 2)
        .on("mouseover", function(d) {

          this.parentNode.append("");
          let outText = "";
          _.forOwn(d, (v, k) => {
            if (true || !["x", "y", "vy", "vx", "index"].includes(k)) {
              outText += k + " : " + v + "<br/>";
            }
          });
          tooltip.transition()
            .duration(0)
            .style("opacity", 1);
          tooltip.html(outText)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY + 10) + "px")
        })
        .on("mouseout", function(d) {
          tooltip.transition()
            .duration(0)
            .style("opacity", 0);
        })
        .on("click", zoomInClick);

      let allNodes = zeroNodes.merge(oneNodes);

      let labelsLyphNodes = this.g.append("g")
      labelsLyphNodes
        .selectAll("text")
        .data(mergedNodes)
        .enter().append("text")
        .attr("x", (d) => {
          return d.x - 7 - nodeWidth / 2
        })
        .attr("y", (d) => {
          return d.y + 3
        })
        .style("fill", "#000")
        .style("stroke", "#000")
        .style("dy", "0.25em")
        .text((d) => {
          return d.id;
        })

    });

    let width = this.width;
    let height = this.height;
    let svg = this.svg;
    let g = this.g;
    let origTranslateX = this.translateX;
    let origTranslateY = this.translateY;

    let zoom = d3.zoom()
      .scaleExtent([0.1, 2])
      .on("zoom", zoomed);

    function zoomInClick(d) {
      if (active.node() === this) return reset();
      active.classed("active", false);
      // console.log(d);
      active = d3.select(this).classed("active", true);

      let scale = Math.max(22, Math.min(8, 0.9 / Math.max(d.vx / width, d.vy / height))),
        translateX = width / 60 - scale * d.x + origTranslateX,
        translateY = height / 60 - scale * d.y + origTranslateY;

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale)); // updated for d3 v4
    }

    function reset() {
      active.classed("active", false);
      active = d3.select(null);

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(origTranslateX, origTranslateY)); // updated for d3 v4
    }

    function zoomed() {
      g.attr("transform", d3.event.transform); // updated for d3 v4
    }
  }
}