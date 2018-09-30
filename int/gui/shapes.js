let build_arrow = (svg) => {
  svg.append("svg:defs").selectAll("marker")
      .data(["end"])      // Different link/path types can be defined here
    .enter().append("svg:marker")    // This section adds in the arrows
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 33)
      .attr("refY", 0) //-1.5)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("fill", "#009900")
      .attr("orient", "auto")
      .attr('xoverflow','visible')
    .append("svg:path")
      // .attr("d", "M0,3v-3l6,3l-6,3z");
      // .attr("d", "M0,0 L0,6 L9,3 z");

      .attr("d", "M0,-5L10,0L0,5");
}

export { build_arrow };
