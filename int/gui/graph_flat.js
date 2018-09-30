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
    .style("dy", "0.15em")
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
      .style("dy", "0.15em")
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