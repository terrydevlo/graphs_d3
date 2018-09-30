export default class CtrlsUI {
  constructor() {

  }


  build_gui( allData, layoutOpts, els ) {
    this.els = els;

    // handle dat init

    this.init_data(allData);

    this.make_cmap();

    this.layoutOpts = layoutOpts;

    this.set_data_state(this.selState.dat);
    this.set_layout_state();

  }

  init_data( allData ) {

    this.allData = allData;
    this.datasetsAvail = _.keys( this.allData );
    this.selState = {};

    this.selState.dat = this.datasetsAvail[0];

    this.currDataset = this.allData[this.selState.dat];

    this.nodesAvail = _.keys( this.currDataset["nodes"] );
    this.edgesAvail = _.keys( this.currDataset["edges"] );

    this.bind_show_labels_chkbox(this.els.selLabels, "labelsChange");

  }


  set_data_state(selDat){
    console.log("selDat: ", selDat, " this.selState: ", this.selState);
    console.log("this.datasetsAvail: ", this.datasetsAvail);
    if (selDat){
      this.selState.dat = selDat;
      this.currDataset = this.allData[this.selState.dat];

      this.nodesAvail = _.keys( this.currDataset["nodes"] );
      this.edgesAvail = _.keys( this.currDataset["edges"] );

      this.build_select( this.datasetsAvail, this.selState.dat, this.els.selDat, "dataChange" );
    }

    this.set_node_state();

    this.set_edges_state();

    this.make_cmap();


    console.log("selDat: ", this.selState.dat, " this.selState: ", this.selState.dat);

    console.log("this.allData: ", this.allData);
    // console.log("this.selDat: ", this.selDat);

  }

  set_node_state( selNodes ){
    console.log("old selStateNodes:", this.selState.nodes);
    if (!selNodes){
      this.selState.nodes = this.nodesAvail[0];
    } else {
      this.selState.nodes = selNodes;
    }
    console.log("old selStateNodes:", this.selState.nodes);

    this.build_select( this.nodesAvail, this.selState.nodes, this.els.selNodes, "nodeChange" );

  }

  set_edges_state( selEdges ){
    if (!selEdges){
      this.selState.edges = this.edgesAvail[0];
    } else {
      this.selState.edges = selEdges;
    }

  }

  set_layout_state( selLayout ){
    console.log("setting layout state to . . . ", selLayout);
    if (!selLayout){
      this.selState.layout = this.layoutOpts[0];
    } else {
      this.selState.layout = selLayout;
    }
    this.build_select( this.layoutOpts, this.selState.layout, this.els.selLayout, "layoutChange" );

  }

  make_cmap(  ){
    this.cmap = d3.map();

    this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);


    this.nodeAndEdgesFiles = _.concat(this.nodesAvail, this.edgesAvail);
    console.log("=== ==== ===: ", this.nodeAndEdgesFiles)

    this.nodeAndEdgesFiles.forEach((d, i) => {
      this.cmap.set(d, this.colorScale(i));
    });
    console.log("this.cmap: ", this.cmap);
  }



  bind_show_labels_chkbox(elId, evScope) {
    let elSel = d3.select(elId);
    elSel.on("change", (d) => {
      let elSelThis = d3.select(elId);
      let elProperty = elSelThis.property('checked');
      elSelThis.style('color', this.cmap.get(elProperty));
      elSelThis.style('border', () => {
        return "solid 1px " + this.cmap.get(elProperty)
      });

      window.dispatch.call(evScope, elSel, elProperty);
    })
  }


  event_change_select_box(elId, evScope, elSel){
    let elSelThis = d3.select(elId);
    let elProperty = elSelThis.property('value');
    elSelThis.style('color', this.cmap.get(elProperty));
    elSelThis.style('border', () => {
      return "solid 1px " + this.cmap.get(elProperty)
    });

    window.dispatch.call(evScope, elSel, elProperty);
  }


  build_select(values, selected, elId, evScope) {

    let elSel = d3.select( elId );
    elSel.selectAll("*").remove();

    elSel.on("change", (d) => {
      this.event_change_select_box( elId, evScope, elSel )
      })
      .style("color", ()=>{
        if (this.cmap && this.cmap.get(selected)){
          return this.cmap.get(selected);
        } else {
          return "#000";
        }
      })
      .style("border", () => {
        if (this.cmap && this.cmap.get(selected)){
          return "solid 1px " + this.cmap.get(selected);
        } else {
          return "solid 1px #000";
        }
      });


    elSel.selectAll("option")
      .data(values)
      .enter().append("option")
      .attr("value", (d) => {
        return d;
      })
      .property("selected", (d) => {

        return d === selected;
      })
      .style("color", (d, i) => {
        if (this.cmap && this.cmap.get(selected)){
          return this.cmap.get(selected);
        } else {
          return "#000";
        }

      })
      .text((d) => {
        return d;
      });

  }



  build_checkboxes(values, checked,p) {

    let elSel = d3.select(p['elId'])
    elSel.selectAll("*").remove();

    let divChkboxes = elSel.selectAll("div")
      .data(values)
      .enter().append("div")
      .attr("class", "divChkbox");

    divChkboxes
      .append("input")
      .attr("type", "checkbox")
      .attr("value", (d) => {
        return d;
      })
      .attr("id", (d) => {
        return "chk" + d.replace(" ","_").replace(" ","_").replace(" ","_").replace(" ","_");
      })
      .attr("class", "chkbox")
      .style("outline", (d, i) => {
        if (this.cmap.get(d)) {
          return "2px solid " + this.cmap.get(d);
        }
      })
      .on("change", (d) => {
        console.log(d);
        let thisID = "#chk" + d.replace(" ","_").replace(" ","_").replace(" ","_").replace(" ","_");

        let thisEl = d3.select(thisID);
        console.log("thisEl: ", thisEl);

        let checkedVal = thisEl._groups[0][0].checked;
        window.dispatch.call(p['evScope'], elSel, d, checkedVal);
      })
      .property("checked", (d) => {
        return checked.get(d)
      });

    divChkboxes
      .append("label")
      .style("color", (d, i) => {
        if (this.cmap.get(d)) {
          return this.cmap.get(d);
        }
      })
      .text((d) => {
        return d;
      });
  }


  build_radios(values, checked, p) {
    if (!_.isArray(checked)){
    }
    let elSel = d3.select(p['elId'])
    elSel.selectAll("*").remove();

    console.log(values);

    let divRadios = elSel.selectAll("div")
      .data(values)
      .enter().append("div")
      .attr("class", "divRadios");

    divRadios
      .append("input")
      .attr("type", "radio")
      .attr("value", (d) => {
        return d;
      })
      .attr("id", (d) => {
        return "rd" + d;
      })
      .attr("class", "rdio")
      .attr("name", () => {
        return "rdio" + p['evScope']
      })
      .style("outline", (d, i) => {

        if (this.cmap.get(d)) {
          return "2px solid " + p['cMap'].get(d);
        }
      })
      .on("change", (d) => {
        let thisID = "#rd" + d;
        let thisEl = d3.select(thisID);
        let checkedVal = thisEl._groups[0][0].checked;
        window.dispatch.call(p['evScope'], elSel, d, checkedVal);
      })
      .property("checked", (d) => {
        console.log(checked, " ", d);
        return checked.includes(d);
      });

    divRadios
      .append("label")
      .style("color", (d, i) => {
        if (this.cmap.get(d)) {
          return this.cmap.get(d);
        }
      })
      .text((d) => {
        return d;
      });

  }

  reset_checkboxes(checked, elId, className) {
    console.log(checked);
    let elSel = d3.select(elId)

    elSel.selectAll(className)
      .property("checked", (d) => {
        console.log("D: ", d);
        let isChecked = d === checked;
        this.edgesMap.set(d, isChecked);
        return isChecked;
      });
  }



}